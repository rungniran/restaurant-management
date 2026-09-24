import { Router } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Restaurant from "../models/Restaurant.js";
import Staff from "../models/Staff.js";
import { requirePlatformAdmin } from "../middleware/platformAdmin.js";

const router = Router();

function constantTimeEqual(provided, expected) {
  const providedDigest = crypto.createHash("sha256").update(provided).digest();
  const expectedDigest = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(providedDigest, expectedDigest);
}

router.post("/login", (req, res) => {
  const configuredPassword = process.env.PLATFORM_ADMIN_PASSWORD;
  const configuredUsername = process.env.PLATFORM_ADMIN_USERNAME || "admin";
  if (!configuredPassword) return res.status(503).json({ error: "ยังไม่ได้ตั้งค่า PLATFORM_ADMIN_PASSWORD ในระบบ" });

  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string" ||
      !constantTimeEqual(username.trim(), configuredUsername) || !constantTimeEqual(password, configuredPassword)) {
    return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }

  const token = jwt.sign({ type: "platform-admin", username: configuredUsername }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.json({ token, username: configuredUsername, expiresIn: 3600 });
});

router.get("/signups", requirePlatformAdmin, async (req, res) => {
  const bangkokNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  bangkokNow.setUTCHours(0, 0, 0, 0);
  const bangkokMidnightUtc = new Date(bangkokNow.getTime() - 7 * 60 * 60 * 1000);
  const [restaurants, total, today] = await Promise.all([
    Restaurant.find({}).sort({ createdAt: -1 }).limit(200)
      .select("name displayName phone address pricingMode subscriptionStatus trialEndsAt createdAt")
      .lean(),
    Restaurant.countDocuments(),
    Restaurant.countDocuments({ createdAt: { $gte: bangkokMidnightUtc } }),
  ]);

  const restaurantIds = restaurants.map((restaurant) => restaurant._id);
  const owners = await Staff.find({ restaurantId: { $in: restaurantIds }, role: "owner" })
    .select("restaurantId name username")
    .lean();
  const ownersByRestaurant = new Map(owners.map((owner) => [String(owner.restaurantId), owner]));

  res.json({
    total,
    today,
    shown: restaurants.length,
    signups: restaurants.map((restaurant) => {
      const owner = ownersByRestaurant.get(String(restaurant._id));
      return {
        id: String(restaurant._id),
        name: restaurant.name,
        displayName: restaurant.displayName,
        phone: restaurant.phone,
        address: restaurant.address,
        pricingMode: restaurant.pricingMode,
        subscriptionStatus: restaurant.subscriptionStatus,
        trialEndsAt: restaurant.trialEndsAt,
        createdAt: restaurant.createdAt,
        owner: owner ? { name: owner.name, username: owner.username } : null,
      };
    }),
  });
});

export default router;
