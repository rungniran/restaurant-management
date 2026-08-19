import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getPublicMenu,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
} from "../controllers/menu.controller.js";

const router = Router();

// public
router.get("/:restaurantId", getPublicMenu);

// admin (owner/manager)
router.post("/category", requireAuth, requireRole("owner", "manager"), createCategory);
router.patch("/category/:id", requireAuth, requireRole("owner", "manager"), updateCategory);
router.delete("/category/:id", requireAuth, requireRole("owner", "manager"), deleteCategory);

router.post("/item", requireAuth, requireRole("owner", "manager"), createMenuItem);
router.patch("/item/:id", requireAuth, requireRole("owner", "manager"), updateMenuItem);
router.delete("/item/:id", requireAuth, requireRole("owner", "manager"), deleteMenuItem);
router.patch("/item/:id/toggle", requireAuth, requireRole("owner", "manager"), toggleAvailability);

export default router;
