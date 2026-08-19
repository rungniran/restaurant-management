import ServiceRequest from "../models/ServiceRequest.js";
import Table from "../models/Table.js";
import { emitServiceRequest, emitServiceAcknowledged } from "../sockets/index.js";

// POST /api/service-request  (public, customer)
// body: { qrToken, type, note }
export async function createServiceRequest(req, res) {
  const { qrToken, type, note } = req.body;
  const table = await Table.findOne({ qrToken });
  if (!table) return res.status(404).json({ error: "ไม่พบโต๊ะนี้" });

  const request = await ServiceRequest.create({
    restaurantId: table.restaurantId,
    tableId: table._id,
    type: type || "call_staff",
    note: note || "",
    status: "pending",
  });

  emitServiceRequest(table.restaurantId, request);
  res.status(201).json(request);
}

// GET /api/service-request  (staff auth) - pending requests
export async function listPendingRequests(req, res) {
  const requests = await ServiceRequest.find({
    restaurantId: req.staff.restaurantId,
    status: "pending",
  }).sort({ createdAt: 1 });
  res.json(requests);
}

// PATCH /api/service-request/:id/acknowledge  (staff auth)
export async function acknowledgeRequest(req, res) {
  const request = await ServiceRequest.findOneAndUpdate(
    { _id: req.params.id, restaurantId: req.staff.restaurantId },
    { status: "acknowledged" },
    { new: true }
  );
  if (!request) return res.status(404).json({ error: "Request not found" });
  emitServiceAcknowledged(request.restaurantId, request);
  res.json(request);
}
