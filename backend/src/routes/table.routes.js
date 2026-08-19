import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getTableByToken,
  getBillSummary,
  listTables,
  createTable,
  updateTableStatus,
  releaseTable,
  mergeTables,
  unmergeTable,
  regenerateQr,
  toggleTableActive,
  deleteTable,
} from "../controllers/table.controller.js";

const router = Router();

// public
router.get("/qr/:qrToken", getTableByToken);
router.get("/qr/:qrToken/bill-summary", getBillSummary);

// admin/staff
router.get("/", requireAuth, listTables);
router.post("/", requireAuth, requireRole("owner", "manager"), createTable);
router.post("/merge", requireAuth, requireRole("owner", "manager", "waiter", "cashier"), mergeTables);
router.patch("/:id/unmerge", requireAuth, requireRole("owner", "manager", "waiter", "cashier"), unmergeTable);
router.patch("/:id/release", requireAuth, requireRole("owner", "manager", "waiter", "cashier"), releaseTable);
router.patch("/:id/status", requireAuth, updateTableStatus);
router.patch("/:id/regenerate-qr", requireAuth, requireRole("owner", "manager"), regenerateQr);
router.patch("/:id/toggle-active", requireAuth, requireRole("owner", "manager"), toggleTableActive);
router.delete("/:id", requireAuth, requireRole("owner", "manager"), deleteTable);

export default router;
