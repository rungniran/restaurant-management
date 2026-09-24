export function isSubscriptionActive(restaurant) {
  if (!restaurant) return false;
  const status = restaurant.subscriptionStatus || "trial";
  if (status === "active") {
    return !restaurant.paidUntil || new Date(restaurant.paidUntil) > new Date();
  }
  if (status === "trial") {
    return getTrialEndsAt(restaurant) > new Date();
  }
  return false;
}

export function getTrialEndsAt(restaurant) {
  if (restaurant.trialEndsAt) return new Date(restaurant.trialEndsAt);
  const createdAt = new Date(restaurant.createdAt || Date.now());
  createdAt.setMonth(createdAt.getMonth() + 3);
  return createdAt;
}

export function subscriptionError(res) {
  return res.status(402).json({
    error: "ช่วงทดลองใช้ฟรี 3 เดือนหมดแล้ว กรุณาเลือกแพ็กเกจเพื่อใช้งานต่อ",
    code: "SUBSCRIPTION_REQUIRED",
  });
}