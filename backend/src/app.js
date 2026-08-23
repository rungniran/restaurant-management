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

const app = express();
const corsOrigins = (process.env.CORS_ORIGIN || "*").split(",");

// Setup multer for file uploads
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^\w\s]/gi, "");
    cb(null, `${name}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
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

// General API rate limit as a safety net against abuse/scraping.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

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
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename });
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
