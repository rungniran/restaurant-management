import Order from "../models/Order.js";
import MenuItem from "../models/MenuItem.js";
import Table from "../models/Table.js";
import { emitNewOrder, emitOrderUpdated, emitTableStatus } from "../sockets/index.js";
import { sessionCutoff } from "../utils/session.js";

function genOrderNumber() {
  const now = new Date();
  const stamp = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
  return `O${stamp}${Math.floor(Math.random() * 90 + 10)}`;
}

// POST /api/order  (public, customer)
// body: { qrToken, items: [{ menuItemId, quantity, selectedOptions, note }] }
export async function createOrder(req, res) {
  const { qrToken, items } = req.body;
  if (!qrToken || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "ข้อมูลไม่ครบ (qrToken, items)" });
  }

  const table = await Table.findOne({ qrToken, isActive: true });
  if (!table) return res.status(404).json({ error: "ไม่พบโต๊ะนี้" });

  // First order of a fresh visit: start the new dining session BEFORE creating
  // the order, so its own createdAt can never fall before sessionStartedAt.
  // (Doing this the other way around — bumping sessionStartedAt after the order
  // is created — was the bug: the freshly created order's timestamp is always
  // slightly earlier than "new Date()" called afterward, so it would get
  // silently filtered out of the customer's own order-status view.)
  const startingNewSession = table.status === "available";
  if (startingNewSession) {
    table.status = "ordering";
    table.sessionStartedAt = new Date();
    await table.save();
  }

  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItems = await MenuItem.find({ _id: { $in: menuItemIds }, restaurantId: table.restaurantId });
  const menuMap = new Map(menuItems.map((m) => [String(m._id), m]));

  const orderItems = [];
  let subtotal = 0;

  for (const reqItem of items) {
    const menuItem = menuMap.get(String(reqItem.menuItemId));
    if (!menuItem || !menuItem.isAvailable) {
      return res.status(400).json({ error: `เมนู "${reqItem.name || reqItem.menuItemId}" ไม่พร้อมขาย` });
    }
    const qty = Math.max(1, Number(reqItem.quantity) || 1);
    const selectedOptions = (reqItem.selectedOptions || []).map((o) => ({
      groupName: o.groupName,
      choice: o.choice,
      extraPrice: Number(o.extraPrice) || 0,
    }));
    const extra = selectedOptions.reduce((sum, o) => sum + o.extraPrice, 0);
    const lineTotal = (menuItem.price + extra) * qty;
    subtotal += lineTotal;

    orderItems.push({
      menuItemId: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: qty,
      selectedOptions,
      note: reqItem.note || "",
      station: menuItem.station,
      itemStatus: "new",
      lineTotal,
    });
  }

  const order = await Order.create({
    restaurantId: table.restaurantId,
    tableId: table._id,
    orderNumber: genOrderNumber(),
    status: "pending",
    items: orderItems,
    subtotal,
    total: subtotal, // discount/serviceCharge/vat applied at checkout time
  });

  if (startingNewSession) emitTableStatus(table.restaurantId, table);

  const orderWithTable = { ...order.toObject(), tableNumber: table.tableNumber };
  emitNewOrder(table.restaurantId, orderWithTable);
  res.status(201).json(order);
}

// GET /api/order/table/:qrToken  (public, customer polls/loads their own orders)
export async function getOrdersForTable(req, res) {
  const table = await Table.findOne({ qrToken: req.params.qrToken });
  if (!table) return res.status(404).json({ error: "ไม่พบโต๊ะนี้" });
  const orders = await Order.find({
    tableId: table._id,
    createdAt: { $gte: sessionCutoff(table) },
  }).sort({ createdAt: 1 });
  res.json(orders);
}

// ---- Staff / Kitchen ----

// GET /api/order/kitchen?station=kitchen  (staff auth)
export async function getKitchenOrders(req, res) {
  const { restaurantId } = req.staff;
  const { station } = req.query;
  const orders = await Order.find({
    restaurantId,
    status: { $in: ["pending", "accepted", "cooking"] },
  })
    .sort({ createdAt: 1 })
    .populate("tableId", "tableNumber zone");

  const withTableNumber = orders.map((o) => ({
    ...o.toObject(),
    tableNumber: o.tableId?.tableNumber,
    tableId: o.tableId?._id || o.tableId,
  }));

  if (!station) return res.json(withTableNumber);

  // filter to only orders that have at least one item on this station
  const filtered = withTableNumber
    .map((o) => ({ ...o, items: o.items.filter((it) => it.station === station) }))
    .filter((o) => o.items.length > 0);

  res.json(filtered);
}

// PATCH /api/order/:orderId/item/:itemId  { itemStatus }  (staff/kitchen auth)
export async function updateOrderItemStatus(req, res) {
  const { orderId, itemId } = req.params;
  const { itemStatus } = req.body;

  const order = await Order.findOne({ _id: orderId, restaurantId: req.staff.restaurantId });
  if (!order) return res.status(404).json({ error: "Order not found" });

  const item = order.items.id(itemId);
  if (!item) return res.status(404).json({ error: "Order item not found" });
  item.itemStatus = itemStatus;

  // derive overall order status from item statuses
  const statuses = order.items.map((i) => i.itemStatus);
  if (statuses.every((s) => s === "done" || s === "cancelled")) {
    order.status = "served";
    order.servedAt = new Date();
  } else if (statuses.some((s) => s === "cooking")) {
    order.status = "cooking";
  } else if (statuses.some((s) => s === "accepted")) {
    order.status = "accepted";
    if (!order.acceptedAt) order.acceptedAt = new Date();
  }

  await order.save();
  emitOrderUpdated(order.restaurantId, order);
  res.json(order);
}

// PATCH /api/order/:orderId/status  { status }  (staff auth) - bulk order-level update
export async function updateOrderStatus(req, res) {
  const { status } = req.body;
  const order = await Order.findOneAndUpdate(
    { _id: req.params.orderId, restaurantId: req.staff.restaurantId },
    { status, ...(status === "served" ? { servedAt: new Date() } : {}) },
    { new: true }
  );
  if (!order) return res.status(404).json({ error: "Order not found" });
  emitOrderUpdated(order.restaurantId, order);
  res.json(order);
}

// GET /api/order/restaurant  (admin/staff, list all with pagination for dashboard)
export async function listOrders(req, res) {
  const { restaurantId } = req.staff;
  const { from, to, status } = req.query;
  const filter = { restaurantId };
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json(orders);
}
