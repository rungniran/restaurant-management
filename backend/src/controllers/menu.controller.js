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
  const category = await Category.findOneAndUpdate(
    { _id: req.params.id, restaurantId: req.staff.restaurantId },
    req.body,
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

export async function createMenuItem(req, res) {
  const { restaurantId } = req.staff;
  const item = await MenuItem.create({ ...req.body, restaurantId });
  res.status(201).json(item);
}

export async function updateMenuItem(req, res) {
  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, restaurantId: req.staff.restaurantId },
    req.body,
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
