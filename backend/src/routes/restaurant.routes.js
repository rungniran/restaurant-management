import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createRestaurant,
  listRestaurants,
  getSetupStatus,
  getMyRestaurant,
  updateMyRestaurant,
} from "../controllers/restaurant.controller.js";

const router = Router();

router.post("/", createRestaurant);
router.get("/", listRestaurants);
router.get("/setup-status", requireAuth, getSetupStatus);
router.get("/me", requireAuth, getMyRestaurant);
router.patch("/me", requireAuth, requireRole("owner", "manager"), updateMyRestaurant);

export default router;
