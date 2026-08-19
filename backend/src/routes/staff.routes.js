import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  login,
  loginGoogle,
  me,
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
} from "../controllers/staff.controller.js";

const router = Router();

router.post("/login", login);
router.post("/login-google", loginGoogle);
router.get("/me", requireAuth, me);

router.get("/", requireAuth, requireRole("owner", "manager"), listStaff);
router.post("/", requireAuth, requireRole("owner", "manager"), createStaff);
router.patch("/:id", requireAuth, requireRole("owner", "manager"), updateStaff);
router.delete("/:id", requireAuth, requireRole("owner", "manager"), deleteStaff);

export default router;
