import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createServiceRequest,
  listPendingRequests,
  acknowledgeRequest,
} from "../controllers/serviceRequest.controller.js";

const router = Router();

// public (customer)
router.post("/", createServiceRequest);

// staff
router.get("/", requireAuth, listPendingRequests);
router.patch("/:id/acknowledge", requireAuth, acknowledgeRequest);

export default router;
