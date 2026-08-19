import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import Restaurant from "../models/Restaurant.js";
import Staff from "../models/Staff.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/staff/login  (public)  body: { username, password, restaurantId? }
export async function login(req, res) {
  const { username, password, restaurantId } = req.body;

  const query = { username, isActive: true };
  if (restaurantId) query.restaurantId = restaurantId;

  const matches = await Staff.find(query).sort({ createdAt: 1 });
  if (!matches.length) {
    return res.status(401).json({ error: "ไม่พบผู้ใช้งานในร้านนี้" });
  }

  const staff = matches[0];
  const valid = await bcrypt.compare(password, staff.passwordHash);
  if (!valid) return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });

  const restaurant = await Restaurant.findById(staff.restaurantId).select("name");

  const token = jwt.sign(
    { id: staff._id, restaurantId: staff.restaurantId, role: staff.role, name: staff.name },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({
    token,
    staff: {
      id: staff._id,
      name: staff.name,
      role: staff.role,
      restaurantId: staff.restaurantId,
      restaurantName: restaurant?.name || "",
    },
  });
}

export async function loginGoogle(req, res) {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: "กรุณาให้ Google credential" });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    console.error("Google ID token verification failed", err);
    return res.status(401).json({ error: "Google token ไม่ถูกต้องหรือหมดอายุ" });
  }

  const email = payload?.email;
  if (!email) return res.status(400).json({ error: "Google account ไม่มีอีเมล" });

  const normalized = String(email).trim().toLowerCase();
  let staff = await Staff.findOne({ email: normalized, isActive: true }).sort({ createdAt: 1 });

  if (!staff) {
    const restaurant = await Restaurant.findOne({}).sort({ createdAt: 1 });
    if (!restaurant) return res.status(404).json({ error: "ยังไม่มีร้านให้ใช้ระบบ" });

    const baseUsername = `${normalized.split("@")[0].replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "google-user"}`;
    const username = await generateUniqueUsername(baseUsername, restaurant._id);
    const passwordHash = await bcrypt.hash(`google-${Date.now()}`, 10);

    staff = await Staff.create({
      restaurantId: restaurant._id,
      name: payload.name || payload.given_name || "Google User",
      email: normalized,
      username,
      passwordHash,
      role: "owner",
    });
  }

  const restaurant = await Restaurant.findById(staff.restaurantId).select("name");
  const token = jwt.sign(
    { id: staff._id, restaurantId: staff.restaurantId, role: staff.role, name: staff.name },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({
    token,
    staff: {
      id: staff._id,
      name: staff.name,
      role: staff.role,
      restaurantId: staff.restaurantId,
      restaurantName: restaurant?.name || "",
    },
  });
}

async function generateUniqueUsername(baseUsername, restaurantId) {
  let username = baseUsername;
  let counter = 1;

  while (await Staff.exists({ username, restaurantId })) {
    username = `${baseUsername}-${counter}`;
    counter += 1;
  }

  return username;
}

// GET /api/staff/me  (auth)
export async function me(req, res) {
  res.json(req.staff);
}

// ---- Admin: manage staff accounts (owner/manager only) ----

export async function listStaff(req, res) {
  const staff = await Staff.find({ restaurantId: req.staff.restaurantId }).select("-passwordHash");
  res.json(staff);
}

export async function createStaff(req, res) {
  const { name, username, password, role } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);
  const staff = await Staff.create({
    restaurantId: req.staff.restaurantId,
    name,
    username,
    passwordHash,
    role,
  });
  res.status(201).json({ id: staff._id, name: staff.name, username: staff.username, role: staff.role });
}

export async function updateStaff(req, res) {
  const updates = { ...req.body };
  if (updates.password) {
    updates.passwordHash = await bcrypt.hash(updates.password, 10);
    delete updates.password;
  }
  const staff = await Staff.findOneAndUpdate(
    { _id: req.params.id, restaurantId: req.staff.restaurantId },
    updates,
    { new: true }
  ).select("-passwordHash");
  if (!staff) return res.status(404).json({ error: "Staff not found" });
  res.json(staff);
}

export async function deleteStaff(req, res) {
  await Staff.deleteOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  res.json({ success: true });
}
