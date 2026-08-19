import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import Table from "../models/Table.js";
import Restaurant from "../models/Restaurant.js";
import { generatePromptPayPayload } from "../services/promptpay.service.js";
import { emitPaymentUpdated, emitTableStatus } from "../sockets/index.js";
import { sessionCutoff, sessionScopedTableFilter } from "../utils/session.js";

function receiptNumber() {
  const now = new Date();
  return `R${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(
    2,
    "0"
  )}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

async function resolveGroupTables(table) {
  if (!table.groupId) return [table];
  return Table.find({ groupId: table.groupId });
}

async function computeAmount({ orders, restaurant, itemRefs }) {
  let subtotal;
  if (itemRefs && itemRefs.length > 0) {
    // pay for specific items only (split by items)
    subtotal = 0;
    for (const ref of itemRefs) {
      const order = orders.find((o) => String(o._id) === String(ref.orderId));
      const item = order?.items.id(ref.itemId);
      if (item) subtotal += item.lineTotal;
    }
  } else {
    subtotal = orders.reduce((s, o) => s + o.subtotal, 0);
  }
  const serviceCharge = +(subtotal * (restaurant.serviceChargePercent / 100)).toFixed(2);
  const vat = +((subtotal + serviceCharge) * (restaurant.vatPercent / 100)).toFixed(2);
  const amount = +(subtotal + serviceCharge + vat).toFixed(2);
  return { subtotal, serviceCharge, vat, amount };
}

// POST /api/payment/promptpay  (public, customer)
// body: { qrToken, orderIds?, itemRefs?: [{orderId,itemId}] }
// - no orderIds/itemRefs -> pay full outstanding bill (all tables in merge group)
// - orderIds -> pay only those orders (e.g. "จ่ายออเดอร์นี้เลย" ทันทีหลังสั่ง)
// - itemRefs -> pay only specific line items (custom split)
export async function createPromptPayPayment(req, res) {
  const { qrToken, orderIds, itemRefs } = req.body;
  const table = await Table.findOne({ qrToken });
  if (!table) return res.status(404).json({ error: "ไม่พบโต๊ะนี้" });

  const restaurant = await Restaurant.findById(table.restaurantId);
  if (!restaurant?.promptPayId) {
    return res.status(400).json({ error: "ร้านนี้ยังไม่ได้ตั้งค่า PromptPay" });
  }

  const groupTables = await resolveGroupTables(table);
  const groupTableIds = groupTables.map((t) => t._id);

  let orders;
  if (Array.isArray(orderIds) && orderIds.length > 0) {
    orders = await Order.find({ _id: { $in: orderIds }, tableId: { $in: groupTableIds } });
  } else {
    orders = await Order.find({ ...sessionScopedTableFilter(groupTables), status: { $ne: "cancelled" } });
  }
  if (orders.length === 0) return res.status(400).json({ error: "ยังไม่มีออเดอร์สำหรับชำระเงิน" });

  const { subtotal, serviceCharge, vat, amount } = await computeAmount({ orders, restaurant, itemRefs });
  if (amount <= 0) return res.status(400).json({ error: "ยอดชำระต้องมากกว่า 0" });

  const payload = generatePromptPayPayload(restaurant.promptPayId, amount);

  const payment = await Payment.create({
    restaurantId: table.restaurantId,
    tableId: table._id,
    tableIds: groupTableIds,
    orderIds: orders.map((o) => o._id),
    amount,
    method: "promptpay",
    status: "pending",
    promptPayPayload: payload,
    splitType: itemRefs?.length ? "items" : "full",
    itemRefs: itemRefs || [],
    receiptNumber: receiptNumber(),
  });

  table.status = "waiting_bill";
  await table.save();
  emitTableStatus(table.restaurantId, table);

  res.status(201).json({ payment, breakdown: { subtotal, serviceCharge, vat, amount } });
}

// POST /api/payment/split  (public, customer)  หารบิลเท่ากัน N คน
// body: { qrToken, splitCount }
// -> returns N payment docs, each amount = total / splitCount, all referencing the same orders
export async function createSplitPayment(req, res) {
  const { qrToken, splitCount } = req.body;
  const n = Number(splitCount);
  if (!n || n < 2 || n > 20) return res.status(400).json({ error: "จำนวนคนหารบิลต้องอยู่ระหว่าง 2-20" });

  const table = await Table.findOne({ qrToken });
  if (!table) return res.status(404).json({ error: "ไม่พบโต๊ะนี้" });

  const restaurant = await Restaurant.findById(table.restaurantId);
  if (!restaurant?.promptPayId) {
    return res.status(400).json({ error: "ร้านนี้ยังไม่ได้ตั้งค่า PromptPay" });
  }

  const groupTables = await resolveGroupTables(table);
  const groupTableIds = groupTables.map((t) => t._id);
  const orders = await Order.find({ ...sessionScopedTableFilter(groupTables), status: { $ne: "cancelled" } });
  if (orders.length === 0) return res.status(400).json({ error: "ยังไม่มีออเดอร์สำหรับชำระเงิน" });

  const { subtotal, serviceCharge, vat, amount: totalAmount } = await computeAmount({ orders, restaurant });
  const perPersonAmount = +(totalAmount / n).toFixed(2);
  const receipt = receiptNumber();

  const payments = [];
  for (let i = 1; i <= n; i++) {
    // give the last person any rounding remainder so totals reconcile exactly
    const isLast = i === n;
    const thisAmount = isLast
      ? +(totalAmount - perPersonAmount * (n - 1)).toFixed(2)
      : perPersonAmount;

    const payload = generatePromptPayPayload(restaurant.promptPayId, thisAmount);
    const payment = await Payment.create({
      restaurantId: table.restaurantId,
      tableId: table._id,
      tableIds: groupTableIds,
      orderIds: orders.map((o) => o._id),
      amount: thisAmount,
      method: "promptpay",
      status: "pending",
      promptPayPayload: payload,
      splitType: "equal",
      splitIndex: i,
      splitTotal: n,
      receiptNumber: `${receipt}-${i}`,
    });
    payments.push(payment);
  }

  table.status = "waiting_bill";
  await table.save();
  emitTableStatus(table.restaurantId, table);

  res
    .status(201)
    .json({ payments, breakdown: { subtotal, serviceCharge, vat, amount: totalAmount, perPersonAmount } });
}

// POST /api/payment/buffet  (public, customer)  จ่ายบุฟเฟ่ต์แบบรายหัว
// body: { qrToken, headCount }
export async function createBuffetPayment(req, res) {
  const { qrToken, headCount } = req.body;
  const n = Number(headCount);
  if (!n || n < 1 || n > 50) return res.status(400).json({ error: "จำนวนคนต้องอยู่ระหว่าง 1-50" });

  const table = await Table.findOne({ qrToken });
  if (!table) return res.status(404).json({ error: "ไม่พบโต๊ะนี้" });

  const restaurant = await Restaurant.findById(table.restaurantId);
  if (!restaurant?.promptPayId) {
    return res.status(400).json({ error: "ร้านนี้ยังไม่ได้ตั้งค่า PromptPay" });
  }
  if (restaurant.pricingMode !== "buffet" || !Number(restaurant.buffetPricePerPerson)) {
    return res.status(400).json({ error: "ร้านนี้ยังไม่ได้เปิดการชำระแบบบุฟเฟ่ต์รายหัว" });
  }

  const groupTables = await resolveGroupTables(table);
  const groupTableIds = groupTables.map((t) => t._id);
  const orders = await Order.find({ ...sessionScopedTableFilter(groupTables), status: { $ne: "cancelled" } });
  const amount = +(restaurant.buffetPricePerPerson * n).toFixed(2);

  const payload = generatePromptPayPayload(restaurant.promptPayId, amount);
  const payment = await Payment.create({
    restaurantId: table.restaurantId,
    tableId: table._id,
    tableIds: groupTableIds,
    orderIds: orders.map((o) => o._id),
    amount,
    method: "buffet",
    status: "pending",
    promptPayPayload: payload,
    splitType: "buffet",
    splitIndex: 1,
    splitTotal: 1,
    receiptNumber: `${receiptNumber()}-buffet`,
    note: `บุฟเฟ่ต์รายหัว ${n} คน`,
  });

  table.status = "waiting_bill";
  await table.save();
  emitTableStatus(table.restaurantId, table);

  res.status(201).json({
    payment,
    breakdown: {
      headCount: n,
      buffetPricePerPerson: Number(restaurant.buffetPricePerPerson),
      amount,
    },
  });
}

// POST /api/payment/:id/confirm  (staff/cashier marks as paid manually, or webhook calls this)
export async function confirmPayment(req, res) {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error: "Payment not found" });

  payment.status = "paid";
  payment.paidAt = new Date();
  await payment.save();

  // only mark orders served once ALL splits/payments covering them are paid
  const siblingPending = await Payment.find({
    orderIds: { $in: payment.orderIds },
    status: "pending",
    _id: { $ne: payment._id },
  });
  if (siblingPending.length === 0) {
    await Order.updateMany({ _id: { $in: payment.orderIds } }, { status: "served" });
  }

  // Update table status to cleaning/paid when payment is confirmed
  // This fixes the bug where table still shows waiting_bill after payment confirmation
  const groupTables = await resolveGroupTables(await Table.findById(payment.tableId));
  for (const table of groupTables) {
    table.status = "cleaning";
    await table.save();
    emitTableStatus(table.restaurantId, table);
  }

  emitPaymentUpdated(payment.restaurantId, payment);
  res.json(payment);
}

// POST /api/payment/webhook  (payment gateway callback - verify signature per provider in production)
export async function paymentWebhook(req, res) {
  const { paymentId, status } = req.body; // shape depends on real gateway
  const payment = await Payment.findById(paymentId);
  if (!payment) return res.status(404).json({ error: "Payment not found" });

  if (status === "success") {
    payment.status = "paid";
    payment.paidAt = new Date();
    await payment.save();
    const siblingPending = await Payment.find({
      orderIds: { $in: payment.orderIds },
      status: "pending",
      _id: { $ne: payment._id },
    });
    if (siblingPending.length === 0) {
      await Order.updateMany({ _id: { $in: payment.orderIds } }, { status: "served" });
    }

    // Update table status to cleaning when payment is confirmed via webhook
    const groupTables = await resolveGroupTables(await Table.findById(payment.tableId));
    for (const table of groupTables) {
      table.status = "cleaning";
      await table.save();
      emitTableStatus(table.restaurantId, table);
    }

    emitPaymentUpdated(payment.restaurantId, payment);
  } else if (status === "failed") {
    payment.status = "failed";
    await payment.save();
    emitPaymentUpdated(payment.restaurantId, payment);
  }

  res.json({ received: true });
}

// GET /api/payment/table/:qrToken  (public - customer checks payment status; latest payments for this session)
export async function getPaymentByTable(req, res) {
  const table = await Table.findOne({ qrToken: req.params.qrToken });
  if (!table) return res.status(404).json({ error: "ไม่พบโต๊ะนี้" });
  const groupTables = await resolveGroupTables(table);
  const payments = await Payment.find({
    tableIds: { $in: groupTables.map((t) => t._id) },
    createdAt: { $gte: sessionCutoff(table) },
  }).sort({ createdAt: -1 });
  res.json(payments);
}

// POST /api/payment/:id/close-table  (cashier closes table -> available + cleaning)
export async function closeTable(req, res) {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  const table = await Table.findById(payment.tableId);
  if (!table) return res.status(404).json({ error: "Table not found" });

  table.status = "cleaning";
  await table.save();
  emitTableStatus(table.restaurantId, table);
  res.json(table);
}

// ---- Payment history (staff / cashier) ----

// GET /api/payment/history  ?from=&to=&status=&method=&tableId=
export async function getPaymentHistory(req, res) {
  const { restaurantId } = req.staff;
  const { from, to, status, method, tableId } = req.query;
  const filter = { restaurantId };
  if (status) filter.status = status;
  if (method) filter.method = method;
  if (tableId) filter.tableIds = tableId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  const payments = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .limit(500)
    .populate("tableId", "tableNumber zone");
  res.json(payments);
}

// ---- E-receipt ----

// GET /api/payment/:id/receipt  (public — a payment's ObjectId is effectively a
// private link, same pattern most e-receipt/e-ticket links use; no login needed
// so the customer can view/print it right after paying, and staff can re-open
// it from Payment History for a reprint.)
export async function getReceipt(req, res) {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error: "ไม่พบใบเสร็จนี้" });

  const [restaurant, orders, tables] = await Promise.all([
    Restaurant.findById(payment.restaurantId),
    Order.find({ _id: { $in: payment.orderIds } }),
    Table.find({ _id: { $in: payment.tableIds?.length ? payment.tableIds : [payment.tableId] } }).select(
      "tableNumber zone"
    ),
  ]);
  if (!restaurant) return res.status(404).json({ error: "ไม่พบร้านค้า" });

  // Build the itemized line list this receipt covers: specific items only when
  // splitType is "items" (custom split by item), otherwise every item across
  // the covered orders (full bill, or an equal-split ticket referencing the
  // whole group's items for transparency).
  let lineItems = [];
  if (payment.splitType === "items" && payment.itemRefs?.length) {
    for (const ref of payment.itemRefs) {
      const order = orders.find((o) => String(o._id) === String(ref.orderId));
      const item = order?.items.id(ref.itemId);
      if (item) {
        lineItems.push({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          options: item.selectedOptions?.map((o) => o.choice) || [],
          lineTotal: item.lineTotal,
        });
      }
    }
  } else {
    for (const order of orders) {
      for (const item of order.items) {
        if (item.itemStatus === "cancelled") continue;
        lineItems.push({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          options: item.selectedOptions?.map((o) => o.choice) || [],
          lineTotal: item.lineTotal,
        });
      }
    }
  }

  const subtotal = lineItems.reduce((s, i) => s + i.lineTotal, 0);
  const serviceCharge = +(subtotal * (restaurant.serviceChargePercent / 100)).toFixed(2);
  const vat = +((subtotal + serviceCharge) * (restaurant.vatPercent / 100)).toFixed(2);

  res.json({
    receiptNumber: payment.receiptNumber,
    restaurant: { name: restaurant.name, logoUrl: restaurant.logoUrl },
    tableNumbers: tables.map((t) => t.tableNumber),
    items: lineItems,
    // For full/items payments this subtotal (+ service + vat) reconciles exactly
    // with `amount`. For an equal split, this describes the WHOLE group bill
    // (shown for transparency) while `amount` is just this person's own share.
    subtotal,
    serviceCharge,
    vat,
    amount: payment.amount,
    splitType: payment.splitType,
    splitIndex: payment.splitIndex,
    splitTotal: payment.splitTotal,
    method: payment.method,
    status: payment.status,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
  });
}
