import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getSummary } from "../controllers/dashboard.controller.js";

const router = Router();

router.get("/summary", requireAuth, requireRole("owner", "manager", "cashier"), getSummary);

export default router;
