import jwt from "jsonwebtoken";

export function requirePlatformAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบผู้ดูแล" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== "platform-admin") return res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึง" });
    req.platformAdmin = { username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
  }
}
