import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { listInventory, createInventoryItem, updateInventoryItem, adjustInventory, getInventorySummary } from "../controllers/inventory.controller.js";

const router = Router();
router.use(requireAuth, requireRole("owner", "manager"));
router.get("/", listInventory);
router.get("/summary", getInventorySummary);
router.post("/", createInventoryItem);
router.patch("/:id", updateInventoryItem);
router.post("/:id/adjust", adjustInventory);
export default router;