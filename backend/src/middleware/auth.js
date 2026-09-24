import jwt from "jsonwebtoken";
import Staff from "../models/Staff.js";
import Restaurant from "../models/Restaurant.js";
import { isSubscriptionActive, subscriptionError } from "../utils/subscription.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Re-check the DB on every request so that deactivating a staff member
    // or changing their role takes effect immediately, instead of waiting
    // up to 12h for their existing token to expire.
    const staff = await Staff.findById(payload.id).select("role isActive restaurantId tokenVersion");
    if (!staff || !staff.isActive) {
      return res.status(401).json({ error: "Account is inactive or no longer exists" });
    }

    // Reject tokens issued before the account's password/role was last
    // changed (see staff.controller.js changePassword/updateStaff), so a
    // password reset actually logs out any device still holding an old
    // token instead of leaving it valid for up to 12h.
    if ((payload.tokenVersion || 0) !== (staff.tokenVersion || 0)) {
      return res.status(401).json({ error: "Session expired, please log in again" });
    }

    // Keep the billing-status endpoint available so an expired owner can see
    // the next step, while paid/trial access controls all other staff APIs.
    if (!["/subscription", "/setup-status", "/me"].includes(req.path)) {
      const restaurant = await Restaurant.findById(staff.restaurantId).select("subscriptionStatus trialEndsAt paidUntil createdAt");
      if (!isSubscriptionActive(restaurant)) return subscriptionError(res);
    }

    req.staff = {
      id: payload.id,
      restaurantId: String(staff.restaurantId),
      role: staff.role, // always the live role, not the one baked into the token
      name: payload.name,
      tokenVersion: staff.tokenVersion || 0,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.staff || !roles.includes(req.staff.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
}
