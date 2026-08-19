import Reservation from "../models/Reservation.js";
import Table from "../models/Table.js";
import { emitTableStatus } from "../sockets/index.js";

// GET /api/reservation  (staff auth) - list, optional ?date=YYYY-MM-DD&status=
export async function listReservations(req, res) {
  const { restaurantId } = req.staff;
  const { date, status } = req.query;
  const filter = { restaurantId };
  if (status) filter.status = status;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    filter.reservedFor = { $gte: start, $lt: end };
  }
  const reservations = await Reservation.find(filter)
    .sort({ reservedFor: 1 })
    .populate("tableIds", "tableNumber zone");
  res.json(reservations);
}

// POST /api/reservation  (staff auth)  จองโต๊ะ
// body: { tableIds, customerName, phone, partySize, reservedFor, note }
export async function createReservation(req, res) {
  const { restaurantId } = req.staff;
  const { tableIds, customerName, phone, partySize, reservedFor, note } = req.body;

  if (!Array.isArray(tableIds) || tableIds.length === 0 || !customerName || !reservedFor) {
    return res.status(400).json({ error: "ข้อมูลไม่ครบ (tableIds, customerName, reservedFor)" });
  }

  const tables = await Table.find({ _id: { $in: tableIds }, restaurantId });
  if (tables.length !== tableIds.length) {
    return res.status(404).json({ error: "พบโต๊ะบางโต๊ะไม่ถูกต้อง" });
  }

  const reservation = await Reservation.create({
    restaurantId,
    tableIds,
    customerName,
    phone,
    partySize,
    reservedFor: new Date(reservedFor),
    note,
    status: "booked",
  });

  res.status(201).json(reservation);
}

// PATCH /api/reservation/:id  (staff auth) - update status, or details
// status=seated -> mark tables occupied; status=cancelled/completed -> free them up if not already
export async function updateReservation(req, res) {
  const reservation = await Reservation.findOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  if (!reservation) return res.status(404).json({ error: "Reservation not found" });

  Object.assign(reservation, req.body);
  if (req.body.reservedFor) reservation.reservedFor = new Date(req.body.reservedFor);
  await reservation.save();

  if (req.body.status === "seated") {
    const tables = await Table.find({ _id: { $in: reservation.tableIds } });
    for (const t of tables) {
      t.status = "occupied";
      await t.save();
      emitTableStatus(t.restaurantId, t);
    }
  }

  res.json(reservation);
}

// DELETE /api/reservation/:id  (staff auth)
export async function cancelReservation(req, res) {
  const reservation = await Reservation.findOneAndUpdate(
    { _id: req.params.id, restaurantId: req.staff.restaurantId },
    { status: "cancelled" },
    { new: true }
  );
  if (!reservation) return res.status(404).json({ error: "Reservation not found" });
  res.json(reservation);
}
