import InventoryItem from "../models/InventoryItem.js";

const FIELDS = ["name", "unit", "stock", "reorderPoint", "costPerUnit", "supplier", "isActive"];

function pick(body) {
  return Object.fromEntries(FIELDS.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
}

export async function listInventory(req, res) {
  const items = await InventoryItem.find({ restaurantId: req.staff.restaurantId }).sort({ name: 1 });
  res.json(items);
}

export async function createInventoryItem(req, res) {
  const fields = pick(req.body || {});
  if (!fields.name) return res.status(400).json({ error: "กรุณาระบุชื่อวัตถุดิบ" });
  const item = await InventoryItem.create({ ...fields, restaurantId: req.staff.restaurantId });
  res.status(201).json(item);
}

export async function updateInventoryItem(req, res) {
  const item = await InventoryItem.findOneAndUpdate(
    { _id: req.params.id, restaurantId: req.staff.restaurantId },
    pick(req.body || {}),
    { new: true, runValidators: true }
  );
  if (!item) return res.status(404).json({ error: "ไม่พบวัตถุดิบ" });
  res.json(item);
}

export async function adjustInventory(req, res) {
  const delta = Number(req.body?.delta);
  if (!Number.isFinite(delta) || delta === 0) return res.status(400).json({ error: "จำนวนปรับสต็อกไม่ถูกต้อง" });
  const item = await InventoryItem.findOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  if (!item) return res.status(404).json({ error: "ไม่พบวัตถุดิบ" });
  if (item.stock + delta < 0) return res.status(409).json({ error: "สต็อกไม่เพียงพอ" });
  item.stock = +(item.stock + delta).toFixed(3);
  await item.save();
  res.json(item);
}

export async function getInventorySummary(req, res) {
  const items = await InventoryItem.find({ restaurantId: req.staff.restaurantId }).sort({ name: 1 });
  res.json({
    items,
    lowStock: items.filter((item) => item.stock <= item.reorderPoint),
    stockValue: +items.reduce((sum, item) => sum + item.stock * item.costPerUnit, 0).toFixed(2),
  });
}