import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createPromptPayPayment,
  createSplitPayment,
  createBuffetPayment,
  createManualPayment,
  confirmPayment,
  paymentWebhook,
  getPaymentByTable,
  closeTable,
  getPaymentHistory,
  getReceipt,
  uploadSlip,
} from "../controllers/payment.controller.js";

const router = Router();

// public (customer)
router.post("/promptpay", createPromptPayPayment);
router.post("/split", createSplitPayment);
router.post("/buffet", createBuffetPayment);
router.get("/table/:qrToken", getPaymentByTable);
router.get("/:id/receipt", getReceipt);
router.post("/:id/slip", uploadSlip);

// gateway callback (no staff auth - verify signature in production)
router.post("/webhook", paymentWebhook);

// staff/cashier
router.post("/manual", requireAuth, requireRole("owner", "manager", "cashier"), createManualPayment);
router.get("/history", requireAuth, requireRole("owner", "manager", "cashier"), getPaymentHistory);
router.post("/:id/confirm", requireAuth, requireRole("owner", "manager", "cashier"), confirmPayment);
router.post("/:id/close-table", requireAuth, requireRole("owner", "manager", "cashier", "waiter"), closeTable);

export default router;
