import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  listReservations,
  createReservation,
  updateReservation,
  cancelReservation,
} from "../controllers/reservation.controller.js";

const router = Router();

router.get("/", requireAuth, listReservations);
router.post("/", requireAuth, requireRole("owner", "manager", "waiter"), createReservation);
router.patch("/:id", requireAuth, requireRole("owner", "manager", "waiter"), updateReservation);
router.delete("/:id", requireAuth, requireRole("owner", "manager", "waiter"), cancelReservation);

export default router;
