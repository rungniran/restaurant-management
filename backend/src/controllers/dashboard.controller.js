import mongoose from "mongoose";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// GET /api/dashboard/summary  (staff auth: owner/manager/cashier)
export async function getSummary(req, res) {
  const restaurantId = new mongoose.Types.ObjectId(req.staff.restaurantId);
  const today = startOfDay();
  const monthStart = startOfMonth();

  const [todayAgg, monthAgg, bestSellers, paidToday] = await Promise.all([
    Order.aggregate([
      { $match: { restaurantId, createdAt: { $gte: today }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, orderCount: { $sum: 1 }, revenue: { $sum: "$total" } } },
    ]),
    Order.aggregate([
      { $match: { restaurantId, createdAt: { $gte: monthStart }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, orderCount: { $sum: 1 }, revenue: { $sum: "$total" } } },
    ]),
    Order.aggregate([
      { $match: { restaurantId, createdAt: { $gte: monthStart }, status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          qty: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.lineTotal" },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: 10 },
    ]),
    Payment.aggregate([
      { $match: { restaurantId, status: "paid", paidAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  // orders by hour today (peak hour analysis)
  const hourlyAgg = await Order.aggregate([
    { $match: { restaurantId, createdAt: { $gte: today }, status: { $ne: "cancelled" } } },
    { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 }, revenue: { $sum: "$total" } } },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    today: {
      orderCount: todayAgg[0]?.orderCount || 0,
      revenue: todayAgg[0]?.revenue || 0,
      paidRevenue: paidToday[0]?.total || 0,
      avgOrderValue: todayAgg[0] ? +(todayAgg[0].revenue / todayAgg[0].orderCount).toFixed(2) : 0,
    },
    month: {
      orderCount: monthAgg[0]?.orderCount || 0,
      revenue: monthAgg[0]?.revenue || 0,
      avgOrderValue: monthAgg[0] ? +(monthAgg[0].revenue / monthAgg[0].orderCount).toFixed(2) : 0,
    },
    bestSellers,
    hourly: hourlyAgg,
  });
}
