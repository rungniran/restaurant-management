import { nanoid } from "nanoid";
import Table from "../models/Table.js";
import Order from "../models/Order.js";
import { emitTableStatus } from "../sockets/index.js";
import { sessionCutoff, sessionScopedTableFilter } from "../utils/session.js";

// GET /api/table/:qrToken  -> public, resolves QR token to table + active order
export async function getTableByToken(req, res) {
  const table = await Table.findOne({ qrToken: req.params.qrToken, isActive: true });
  if (!table) return res.status(404).json({ error: "ไม่พบโต๊ะนี้ หรือ QR ถูกปิดใช้งาน" });

  // Only orders from the CURRENT dining session — a table gets reused by many
  // customers, so previous (already paid & released) orders must never show up.
  const activeOrders = await Order.find({
    tableId: table._id,
    status: { $ne: "cancelled" },
    createdAt: { $gte: sessionCutoff(table) },
  }).sort({ createdAt: 1 });

  // If this table is merged with others (ต่อโต๊ะ), surface the group's other tables too
  let groupTables = [];
  if (table.groupId) {
    groupTables = await Table.find({ groupId: table.groupId, _id: { $ne: table._id } }).select(
      "tableNumber zone"
    );
  }

  res.json({ table, orders: activeOrders, groupTables });
}

// GET /api/table/qr/:qrToken/bill-summary -> public, combined unpaid total across merged group
export async function getBillSummary(req, res) {
  const table = await Table.findOne({ qrToken: req.params.qrToken });
  if (!table) return res.status(404).json({ error: "ไม่พบโต๊ะนี้" });

  const groupTables = table.groupId
    ? await Table.find({ groupId: table.groupId })
    : [table];

  const orders = await Order.find({
    ...sessionScopedTableFilter(groupTables),
    status: { $ne: "cancelled" },
  }).sort({ createdAt: 1 });

  const perTable = groupTables.map((t) => ({
    tableId: t._id,
    tableNumber: t.tableNumber,
    subtotal: orders.filter((o) => String(o.tableId) === String(t._id)).reduce((s, o) => s + o.subtotal, 0),
  }));

  const restaurantInfo = await (await import("../models/Restaurant.js")).default.findById(table.restaurantId);

  res.json({
    tableIds: groupTables.map((t) => t._id),
    orders,
    subtotal: orders.reduce((s, o) => s + o.subtotal, 0),
    perTable,
    buffetEnabled: restaurantInfo?.pricingMode === "buffet" && Number(restaurantInfo?.buffetPricePerPerson) > 0,
    buffetPricePerPerson: Number(restaurantInfo?.buffetPricePerPerson || 0),
  });
}

// ---- Admin ----

export async function listTables(req, res) {
  const tables = await Table.find({ restaurantId: req.staff.restaurantId }).sort({ zone: 1, tableNumber: 1 });
  res.json(tables);
}

export async function createTable(req, res) {
  const { restaurantId } = req.staff;
  const { tableNumber, zone } = req.body;
  const qrToken = nanoid(12);
  const table = await Table.create({ restaurantId, tableNumber, zone, qrToken });
  res.status(201).json(table);
}

export async function updateTableStatus(req, res) {
  const { status } = req.body;
  const existing = await Table.findOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  if (!existing) return res.status(404).json({ error: "Table not found" });

  // A new party is being seated at a table that was previously available/cleaning
  // -> start a fresh session so old orders from the last customer never resurface.
  const startingNewSession = existing.status === "available" && status && status !== "available";

  existing.status = status;
  if (startingNewSession) existing.sessionStartedAt = new Date();
  await existing.save();

  emitTableStatus(existing.restaurantId, existing);
  res.json(existing);
}

// PATCH /api/table/:id/release  -> ปล่อยโต๊ะ: กลับสู่สถานะ available, ยกเลิกการต่อโต๊ะ
// body: { force?: boolean } - force=true ข้ามการเช็คบิลค้างจ่าย (ใช้ระวังๆ)
export async function releaseTable(req, res) {
  const table = await Table.findOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  if (!table) return res.status(404).json({ error: "Table not found" });

  if (!req.body?.force) {
    const unpaidOrders = await Order.find({
      tableId: table._id,
      status: { $ne: "cancelled" },
    });
    // consider "unpaid" any active order that hasn't been marked served+paid via Payment flow;
    // simplest guard: block if there are orders that are still pending/accepted/cooking
    const stillCooking = unpaidOrders.filter((o) => ["pending", "accepted", "cooking"].includes(o.status));
    if (stillCooking.length > 0) {
      return res.status(400).json({
        error: "ยังมีออเดอร์ที่ยังไม่เสิร์ฟ ไม่สามารถปล่อยโต๊ะได้ (ใช้ force=true เพื่อข้ามการตรวจสอบนี้)",
      });
    }
  }

  const oldGroupId = table.groupId;
  table.status = "available";
  table.groupId = null;
  table.isGroupPrimary = false;
  // Close out this dining session: anything before "now" belongs to the customer
  // who just left, so the next party scanning this table's QR starts with a clean slate.
  table.sessionStartedAt = new Date();
  await table.save();

  // if this table was part of a group, promote another member to primary
  if (oldGroupId) {
    const sibling = await Table.findOne({ groupId: oldGroupId });
    if (sibling) {
      sibling.isGroupPrimary = true;
      await sibling.save();
      emitTableStatus(sibling.restaurantId, sibling);
    }
  }

  emitTableStatus(table.restaurantId, table);
  res.json(table);
}

// POST /api/table/merge  { tableIds: [id1, id2, ...] }  -> ต่อโต๊ะ
export async function mergeTables(req, res) {
  const { tableIds } = req.body;
  if (!Array.isArray(tableIds) || tableIds.length < 2) {
    return res.status(400).json({ error: "ต้องเลือกอย่างน้อย 2 โต๊ะเพื่อรวม" });
  }

  const tables = await Table.find({ _id: { $in: tableIds }, restaurantId: req.staff.restaurantId });
  if (tables.length !== tableIds.length) {
    return res.status(404).json({ error: "พบโต๊ะบางโต๊ะไม่ถูกต้อง" });
  }

  const groupId = nanoid(10);
  for (let i = 0; i < tables.length; i++) {
    tables[i].groupId = groupId;
    tables[i].isGroupPrimary = i === 0;
    if (tables[i].status === "available") tables[i].status = "occupied";
    await tables[i].save();
    emitTableStatus(tables[i].restaurantId, tables[i]);
  }

  res.json({ groupId, tables });
}

// POST /api/table/:id/unmerge  -> แยกโต๊ะออกจากกลุ่ม (โต๊ะเดียว)
export async function unmergeTable(req, res) {
  const table = await Table.findOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  if (!table) return res.status(404).json({ error: "Table not found" });

  const groupId = table.groupId;
  table.groupId = null;
  table.isGroupPrimary = false;
  await table.save();

  // if only one table left in the group, ungroup it too
  if (groupId) {
    const remaining = await Table.find({ groupId });
    if (remaining.length === 1) {
      remaining[0].groupId = null;
      remaining[0].isGroupPrimary = false;
      await remaining[0].save();
      emitTableStatus(remaining[0].restaurantId, remaining[0]);
    } else if (remaining.length > 0 && !remaining.some((t) => t.isGroupPrimary)) {
      remaining[0].isGroupPrimary = true;
      await remaining[0].save();
    }
  }

  emitTableStatus(table.restaurantId, table);
  res.json(table);
}

export async function regenerateQr(req, res) {
  const table = await Table.findOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  if (!table) return res.status(404).json({ error: "Table not found" });
  table.qrToken = nanoid(12);
  await table.save();
  res.json(table);
}

export async function toggleTableActive(req, res) {
  const table = await Table.findOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  if (!table) return res.status(404).json({ error: "Table not found" });
  table.isActive = !table.isActive;
  await table.save();
  res.json(table);
}

export async function deleteTable(req, res) {
  await Table.deleteOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  res.json({ success: true });
}

