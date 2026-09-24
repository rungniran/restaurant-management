import Category from "../models/Category.js";
import MenuItem from "../models/MenuItem.js";

// GET /api/menu/:restaurantId  -> public, grouped by category
export async function getPublicMenu(req, res) {
  const { restaurantId } = req.params;
  const categories = await Category.find({ restaurantId }).sort({ order: 1 });
  const items = await MenuItem.find({ restaurantId }).sort({ createdAt: 1 });

  const grouped = categories.map((cat) => ({
    _id: cat._id,
    name: cat.name,
    items: items.filter((i) => String(i.categoryId) === String(cat._id)),
  }));

  res.json({ categories: grouped });
}

// ---- Admin CRUD ----

export async function createCategory(req, res) {
  const { restaurantId } = req.staff;
  const { name, order } = req.body;
  const category = await Category.create({ restaurantId, name, order });
  res.status(201).json(category);
}

export async function updateCategory(req, res) {
  // Whitelist editable fields — never pass req.body straight into
  // findOneAndUpdate, or a client could smuggle in restaurantId and move
  // this category onto another tenant's restaurant.
  const { name, order } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (order !== undefined) updates.order = order;

  const category = await Category.findOneAndUpdate(
    { _id: req.params.id, restaurantId: req.staff.restaurantId },
    updates,
    { new: true }
  );
  if (!category) return res.status(404).json({ error: "Category not found" });
  res.json(category);
}

export async function deleteCategory(req, res) {
  await Category.deleteOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  await MenuItem.deleteMany({ categoryId: req.params.id });
  res.json({ success: true });
}

// Fields a staff member is allowed to set on a menu item. Deliberately
// excludes restaurantId — spreading req.body directly (the old behaviour)
// let a client pass its own restaurantId and either create/reparent an item
// onto a different tenant's restaurant.
const MENU_ITEM_FIELDS = ["categoryId", "name", "description", "price", "costPrice", "recipe", "imageUrl", "isAvailable", "station", "options"];

function pickMenuItemFields(body) {
  const updates = {};
  for (const field of MENU_ITEM_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field];
  }
  return updates;
}

export async function createMenuItem(req, res) {
  const { restaurantId } = req.staff;
  const fields = pickMenuItemFields(req.body);

  // categoryId must belong to this same restaurant, or a menu item could be
  // filed under (and effectively leak into) another tenant's category.
  if (fields.categoryId) {
    const category = await Category.findOne({ _id: fields.categoryId, restaurantId });
    if (!category) return res.status(400).json({ error: "ไม่พบหมวดหมู่นี้ในร้านของคุณ" });
  }

  const item = await MenuItem.create({ ...fields, restaurantId });
  res.status(201).json(item);
}

export async function updateMenuItem(req, res) {
  const { restaurantId } = req.staff;
  const fields = pickMenuItemFields(req.body);

  if (fields.categoryId) {
    const category = await Category.findOne({ _id: fields.categoryId, restaurantId });
    if (!category) return res.status(400).json({ error: "ไม่พบหมวดหมู่นี้ในร้านของคุณ" });
  }

  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, restaurantId },
    fields,
    { new: true }
  );
  if (!item) return res.status(404).json({ error: "Menu item not found" });
  res.json(item);
}

export async function deleteMenuItem(req, res) {
  await MenuItem.deleteOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  res.json({ success: true });
}

export async function toggleAvailability(req, res) {
  const item = await MenuItem.findOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  if (!item) return res.status(404).json({ error: "Menu item not found" });
  item.isAvailable = !item.isAvailable;
  await item.save();
  res.json(item);
}
