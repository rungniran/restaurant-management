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

  // SECURITY: use one identical error message whether the username doesn't
  // exist or the password is wrong. Returning different messages for each
  // case lets an attacker enumerate valid usernames before even attempting
  // to brute-force a password.
  const GENERIC_LOGIN_ERROR = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";

  const matches = await Staff.find(query).sort({ createdAt: 1 });
  if (!matches.length) {
    // Run a dummy bcrypt compare so this branch takes roughly the same time
    // as the "user exists but wrong password" branch below, closing the
    // timing side-channel that would otherwise also reveal valid usernames.
    await bcrypt.compare(password || "", "$2a$10$CwTycUXWue0Thq9StjUM0uJ8u6JZFYvvXvBt5Q1F7EYIaWvw9nUmS");
    return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
  }

  const staff = matches[0];
  const valid = await bcrypt.compare(password, staff.passwordHash);
  if (!valid) return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
  if (!staff.isActive) return res.status(401).json({ error: GENERIC_LOGIN_ERROR });

  const restaurant = await Restaurant.findById(staff.restaurantId).select("name");

  const token = jwt.sign(
    {
      id: staff._id,
      restaurantId: staff.restaurantId,
      role: staff.role,
      name: staff.name,
      tokenVersion: staff.tokenVersion || 0,
    },
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
      mustChangePassword: !!staff.mustChangePassword,
    },
  });
}

// POST /api/staff/change-password  (auth) body: { currentPassword, newPassword }
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่" });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร" });
  }

  const staff = await Staff.findById(req.staff.id);
  if (!staff) return res.status(404).json({ error: "ไม่พบผู้ใช้งาน" });

  const valid = await bcrypt.compare(currentPassword, staff.passwordHash);
  if (!valid) return res.status(401).json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });

  staff.passwordHash = await bcrypt.hash(newPassword, 10);
  staff.mustChangePassword = false;
  // Invalidate every token issued before this change (see requireAuth).
  staff.tokenVersion = (staff.tokenVersion || 0) + 1;
  await staff.save();

  res.json({ success: true });
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

  // SECURITY: Google login must never auto-provision a new account, and must
  // NEVER grant "owner" to an email nobody has vetted. A staff record with a
  // matching email has to already exist — created deliberately by an
  // owner/manager via createStaff/updateStaff (which also sets `email`) —
  // before that person can sign in with Google. Anyone with an unrecognized
  // Google account is rejected, they are not silently made the owner of
  // whichever restaurant happens to be oldest in the database.
  const staff = await Staff.findOne({ email: normalized, isActive: true }).sort({ createdAt: 1 });
  if (!staff) {
    return res.status(403).json({
      error: "อีเมลนี้ยังไม่ได้รับเชิญให้เข้าใช้งานร้านใด กรุณาติดต่อเจ้าของร้านให้เพิ่มบัญชีของคุณก่อน",
    });
  }

  const restaurant = await Restaurant.findById(staff.restaurantId).select("name");
  const token = jwt.sign(
    {
      id: staff._id,
      restaurantId: staff.restaurantId,
      role: staff.role,
      name: staff.name,
      tokenVersion: staff.tokenVersion || 0,
    },
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

// GET /api/staff/me  (auth)
export async function me(req, res) {
  res.json(req.staff);
}

// ---- Admin: manage staff accounts (owner/manager only) ----

export async function listStaff(req, res) {
  const staff = await Staff.find({ restaurantId: req.staff.restaurantId }).select("-passwordHash");
  res.json(staff);
}

const ASSIGNABLE_ROLES = ["manager", "cashier", "waiter", "kitchen"]; // only "owner" can grant "owner"

export async function createStaff(req, res) {
  const { name, username, password, role, email } = req.body;

  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
  }

  const existing = await Staff.findOne({ username });
  if (existing) {
    return res.status(409).json({ error: "Username นี้มีผู้ใช้งานแล้ว กรุณาใช้ชื่ออื่น" });
  }

  const normalizedEmail = email ? String(email).trim().toLowerCase() : "";
  if (normalizedEmail) {
    const existingEmail = await Staff.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานโดยพนักงานคนอื่นแล้ว" });
    }
  }

  // Only an existing owner may create another owner account. Managers can
  // create any other role but can never grant "owner" — otherwise a manager
  // could escalate their own privileges by creating/promoting an owner account.
  const allowedRoles = req.staff.role === "owner" ? ["owner", ...ASSIGNABLE_ROLES] : ASSIGNABLE_ROLES;
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ error: "ไม่มีสิทธิ์กำหนดตำแหน่งนี้" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const staff = await Staff.create({
    restaurantId: req.staff.restaurantId,
    name,
    username,
    email: normalizedEmail,
    passwordHash,
    role,
    mustChangePassword: true,
  });
  res.status(201).json({
    id: staff._id,
    name: staff.name,
    username: staff.username,
    email: staff.email,
    role: staff.role,
  });
}

export async function updateStaff(req, res) {
  // Fetch the target once, up front, so every check below (owner-editing
  // guard, tokenVersion bump) is based on the ACTUAL record being modified,
  // never on the acting staff member's own token/claims.
  const target = await Staff.findOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  if (!target) return res.status(404).json({ error: "Staff not found" });
  if (target.role === "owner" && req.staff.role !== "owner") {
    return res.status(403).json({ error: "ไม่มีสิทธิ์แก้ไขบัญชีเจ้าของร้าน" });
  }

  // Whitelist editable fields — never spread req.body directly onto the
  // update, or a manager could smuggle in { role: "owner" } (privilege
  // escalation) or reassign restaurantId/other protected fields.
  const { name, username, password, role, isActive, email } = req.body;
  const updates = {};
  let tokenVersionBump = 0;

  if (name !== undefined) updates.name = name;
  if (username !== undefined) {
    const existing = await Staff.findOne({ username, _id: { $ne: req.params.id } });
    if (existing) return res.status(409).json({ error: "Username นี้มีผู้ใช้งานแล้ว" });
    updates.username = username;
  }
  if (email !== undefined) {
    const normalizedEmail = email ? String(email).trim().toLowerCase() : "";
    if (normalizedEmail) {
      const existingEmail = await Staff.findOne({ email: normalizedEmail, _id: { $ne: req.params.id } });
      if (existingEmail) return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานโดยพนักงานคนอื่นแล้ว" });
    }
    updates.email = normalizedEmail;
  }
  if (isActive !== undefined) {
    updates.isActive = isActive;
    // Deactivating is already enforced live by requireAuth's DB re-check, but
    // also bump tokenVersion so a *re-activated* account can't hand back out
    // a token that was floating around from before it was disabled.
    if (isActive === false) tokenVersionBump += 1;
  }

  if (role !== undefined) {
    const allowedRoles = req.staff.role === "owner" ? ["owner", ...ASSIGNABLE_ROLES] : ASSIGNABLE_ROLES;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: "ไม่มีสิทธิ์กำหนดตำแหน่งนี้" });
    }
    updates.role = role;
    // A role change should also invalidate old tokens still carrying the
    // stale role, even though requireAuth already re-reads the live role
    // from the DB on every request — belt and suspenders.
    tokenVersionBump += 1;
  }

  if (password) {
    if (String(password).length < 8) {
      return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
    }
    updates.passwordHash = await bcrypt.hash(password, 10);
    updates.mustChangePassword = true; // force the staff member to set their own password on next login
    tokenVersionBump += 1; // resetting someone else's password should log out their old sessions
  }

  const mongoUpdate = tokenVersionBump > 0 ? { ...updates, $inc: { tokenVersion: tokenVersionBump } } : updates;

  const staff = await Staff.findOneAndUpdate(
    { _id: req.params.id, restaurantId: req.staff.restaurantId },
    mongoUpdate,
    { new: true }
  ).select("-passwordHash");
  if (!staff) return res.status(404).json({ error: "Staff not found" });
  res.json(staff);
}

export async function deleteStaff(req, res) {
  const target = await Staff.findOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  if (!target) return res.status(404).json({ error: "Staff not found" });
  if (target.role === "owner" && req.staff.role !== "owner") {
    return res.status(403).json({ error: "ไม่มีสิทธิ์ลบบัญชีเจ้าของร้าน" });
  }
  await Staff.deleteOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  res.json({ success: true });
}
