import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createOrder,
  getOrdersForTable,
  getKitchenOrders,
  updateOrderItemStatus,
  updateOrderStatus,
  listOrders,
} from "../controllers/order.controller.js";

const router = Router();

// public (customer)
router.post("/", createOrder);
router.get("/table/:qrToken", getOrdersForTable);

// staff/kitchen
router.get("/kitchen", requireAuth, getKitchenOrders);
router.get("/restaurant", requireAuth, listOrders);
router.patch("/:orderId/item/:itemId", requireAuth, updateOrderItemStatus);
router.patch("/:orderId/status", requireAuth, updateOrderStatus);

export default router;
