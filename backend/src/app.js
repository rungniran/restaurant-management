import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";

import { connectDB } from "./config/db.js";
import { initSocket } from "./sockets/index.js";
import { requireAuth, requireRole } from "./middleware/auth.js";

import menuRoutes from "./routes/menu.routes.js";
import tableRoutes from "./routes/table.routes.js";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import serviceRequestRoutes from "./routes/serviceRequest.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import restaurantRoutes from "./routes/restaurant.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";

const app = express();

// SECURITY: don't silently fall back to a wildcard "*" origin if CORS_ORIGIN
// isn't set — that's an easy footgun to carry into production unnoticed.
// Fail loud in production, and default to localhost-only in dev so a missing
// .env doesn't quietly turn into "any website may call this API".
if (!process.env.CORS_ORIGIN && process.env.NODE_ENV === "production") {
  console.error("[Config] CORS_ORIGIN must be set explicitly in production. Refusing to start with a wildcard origin.");
  process.exit(1);
}
const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5175").split(",");

// Setup multer for file uploads
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// SECURITY: `file.mimetype` and the original filename/extension in a multipart
// upload are both just headers the CLIENT sends — trivially spoofable (e.g.
// declare Content-Type: image/jpeg while uploading a .html file). The old
// code trusted both: it whitelisted `file.mimetype` but then kept whatever
// extension the client provided, so a spoofed upload would be written to
// disk as e.g. "photo-123.html" and served back at /uploads/photo-123.html
// with a text/html content-type by express.static — a stored-XSS vector on
// this app's own origin, reachable by anyone who could reach the upload
// endpoint. Fix: buffer the upload in memory, sniff the REAL file type from
// its magic bytes, and pick the extension ourselves from that — never from
// client-supplied input.
const MAGIC_BYTES = [
  { ext: ".jpg", mime: "image/jpeg", check: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: ".png",
    mime: "image/png",
    check: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    ext: ".gif",
    mime: "image/gif",
    check: (b) => b.length >= 6 && b.slice(0, 6).toString("ascii") === "GIF89a" || (b.length >= 6 && b.slice(0, 6).toString("ascii") === "GIF87a"),
  },
  {
    ext: ".webp",
    mime: "image/webp",
    check: (b) =>
      b.length >= 12 &&
      b.slice(0, 4).toString("ascii") === "RIFF" &&
      b.slice(8, 12).toString("ascii") === "WEBP",
  },
];

function detectImageType(buffer) {
  return MAGIC_BYTES.find((entry) => entry.check(buffer)) || null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

app.use(
  helmet({
    // menu images / receipts are fetched cross-origin by the frontend apps;
    // keep CSP off by default here since the frontends are served by this
    // same Express app and use inline styles/scripts via Vite's build output.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

// Rate limit auth endpoints to slow down brute-force / credential stuffing.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});
app.use("/api/staff/login", loginLimiter);
app.use("/api/staff/login-google", loginLimiter);

// createRestaurant (POST /api/restaurant) is a public, unauthenticated
// endpoint that creates a new tenant + owner account. Without its own limiter,
// only the generic 300/min API-wide limit stood between it and a script
// mass-creating restaurants and owner accounts.
const createRestaurantLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 new restaurants per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "สร้างร้านใหม่บ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});
app.use("/api/restaurant", (req, res, next) => {
  if (req.method === "POST") return createRestaurantLimiter(req, res, next);
  next();
});

// General API rate limit as a safety net against abuse/scraping.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);
app.use("/api/inventory", inventoryRoutes);

// Serve uploaded files
app.use("/uploads", express.static(uploadsDir));

// Upload endpoint — requires staff auth (owner/manager) so it can't be used
// as an open file-drop by anyone on the internet.
app.post(
  "/api/upload",
  requireAuth,
  requireRole("owner", "manager"),
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Sniff the real file type from content, never trust the client-declared
    // mimetype/extension. Reject anything whose bytes don't actually match
    // one of the allowed image formats.
    const detected = detectImageType(req.file.buffer);
    if (!detected) {
      return res.status(400).json({ error: "ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ (jpg, png, gif, webp)" });
    }

    // Filename (and therefore extension) is generated entirely server-side —
    // the client's original filename is never used for anything, including
    // display, so there's no path-traversal or extension-spoofing surface.
    const filename = `${crypto.randomUUID()}${detected.ext}`;
    fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);

    res.json({ url: `/uploads/${filename}`, filename });
  }
);

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/menu", menuRoutes);
app.use("/api/table", tableRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/service-request", serviceRequestRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/restaurant", restaurantRoutes);
app.use("/api/reservation", reservationRoutes);

// ---- Serve built frontend apps (after `npm run build:frontend`) ----
// Staff+Kitchen app lives under /staff (built with base: "/staff/")
// Customer app is served at the root, so it must be registered last.
const publicDir = path.join(__dirname, "../public");

app.get("/", (req, res, next) => {
  const indexPath = path.join(publicDir, "staff/index.html");
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

app.use("/staff", express.static(path.join(publicDir, "staff")));
app.get(/^\/staff(\/.*)?$/, (req, res, next) => {
  const indexPath = path.join(publicDir, "staff/index.html");
  res.sendFile(indexPath, (err) => {
    if (err) next(); // build not present yet - fall through
  });
});

app.use(express.static(path.join(publicDir, "customer")));
app.get(/^\/(order|receipt)(\/.*)?$/, (req, res, next) => {
  const indexPath = path.join(publicDir, "customer/index.html");
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).send("Frontend not built yet — run `npm run build:frontend` in backend/.");
  });
});

app.get(/^\/(?!api|staff|order|receipt).*/, (req, res, next) => {
  const indexPath = path.join(publicDir, "staff/index.html");
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).send("Frontend not built yet — run `npm run build:frontend` in backend/.");
  });
});

// generic error handler (must be registered last)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const httpServer = http.createServer(app);
initSocket(httpServer, corsOrigins);

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`[Server] QR Food Order API running on http://localhost:${PORT}`);
  });
});
