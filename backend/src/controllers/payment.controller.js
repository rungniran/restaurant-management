import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import Table from "../models/Table.js";
import Restaurant from "../models/Restaurant.js";
import { generatePromptPayPayload } from "../services/promptpay.service.js";
import { sendLineNotification } from "../services/lineNotify.service.js";
import { emitPaymentUpdated, emitTableStatus } from "../sockets/index.js";
import { sessionCutoff, sessionScopedTableFilter } from "../utils/session.js";
import { isSubscriptionActive, subscriptionError } from "../utils/subscription.js";

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

function itemKey(orderId, itemId) {
  return `${orderId}:${itemId}`;
}

async function findSessionPayments(table, groupTables, statuses = ["pending", "paid"]) {
  return Payment.find({
    restaurantId: table.restaurantId,
    tableIds: { $in: groupTables.map((groupTable) => groupTable._id) },
    status: { $in: statuses },
    createdAt: { $gte: sessionCutoff(table) },
  });
}

// Full/equal/buffet payments settle the whole bill and therefore may not be
// mixed with another checkout. Item payments are different: only overlapping
// items are blocked, allowing friends to pay their own selections separately.
async function ensureCheckoutAvailable(table, groupTables, splitType, itemRefs = []) {
  const sessionPayments = await findSessionPayments(table, groupTables);

  if (splitType !== "items") {
    if (sessionPayments.length > 0) {
      const error = new Error("บิลนี้มีรายการชำระเงินอยู่แล้ว");
      error.statusCode = 409;
      error.paymentId = sessionPayments[0]._id;
      throw error;
    }
    return;
  }

  if (sessionPayments.some((payment) => payment.splitType !== "items")) {
    const error = new Error("บิลนี้กำลังหรือเคยชำระแบบเต็มบิลแล้ว");
    error.statusCode = 409;
    error.paymentId = sessionPayments[0]._id;
    throw error;
  }

  const usedItemKeys = new Set(
    sessionPayments
      .filter((payment) => payment.splitType === "items")
      .flatMap((payment) => payment.itemRefs || [])
      .map((ref) => itemKey(ref.orderId, ref.itemId))
  );
  const duplicate = itemRefs.some((ref) => usedItemKeys.has(itemKey(ref.orderId, ref.itemId)));
  if (duplicate) {
    const error = new Error("มีรายการอาหารที่เลือกอยู่ในบิลที่ชำระหรือรอชำระแล้ว");
    error.statusCode = 409;
    throw error;
  }

}

function sendPaymentConflict(res, error) {
  if (error.statusCode !== 409) throw error;
  return res.status(409).json({ error: error.message, paymentId: error.paymentId });
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

async function markOrdersPaidIfComplete(payment) {
  const table = await Table.findById(payment.tableId);
  if (!table) return false;
  const groupTables = await resolveGroupTables(table);
  const sessionOrders = await Order.find({
    ...sessionScopedTableFilter(groupTables),
    status: { $ne: "cancelled" },
  });
  const sessionPayments = await findSessionPayments(table, groupTables);

  const hasWholeBillPayment = sessionPayments.some(
    (candidate) => candidate.status === "paid" && candidate.splitType !== "items"
  );
  const pendingWholeBillPayment = sessionPayments.some(
    (candidate) => candidate.status === "pending" && candidate.splitType !== "items"
  );

  let completelyPaid = hasWholeBillPayment && !pendingWholeBillPayment;
  if (!completelyPaid && sessionPayments.some((candidate) => candidate.splitType === "items")) {
    const paidItemKeys = new Set(
      sessionPayments
        .filter((candidate) => candidate.status === "paid" && candidate.splitType === "items")
        .flatMap((candidate) => candidate.itemRefs || [])
        .map((ref) => itemKey(ref.orderId, ref.itemId))
    );
    const outstandingItemKeys = sessionOrders.flatMap((order) =>
      order.items
        .filter((item) => item.itemStatus !== "cancelled")
        .map((item) => itemKey(order._id, item._id))
    );
    completelyPaid = outstandingItemKeys.length > 0 && outstandingItemKeys.every((key) => paidItemKeys.has(key));
  }

  if (completelyPaid) {
    await Order.updateMany({ _id: { $in: sessionOrders.map((order) => order._id) } }, { status: "served" });
  }
  return completelyPaid;
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
  if (!isSubscriptionActive(restaurant)) return subscriptionError(res);
  if (!restaurant?.promptPayId) {
    return res.status(400).json({ error: "ร้านนี้ยังไม่ได้ตั้งค่า PromptPay" });
  }

  const groupTables = await resolveGroupTables(table);
  const groupTableIds = groupTables.map((t) => t._id);

  try {
    await ensureCheckoutAvailable(table, groupTables, itemRefs?.length ? "items" : "full", itemRefs);
  } catch (error) {
    return sendPaymentConflict(res, error);
  }

  let orders;
  if (Array.isArray(orderIds) && orderIds.length > 0) {
    orders = await Order.find({
      _id: { $in: orderIds },
      ...sessionScopedTableFilter(groupTables),
      status: { $ne: "cancelled" },
    });
  } else {
    orders = await Order.find({ ...sessionScopedTableFilter(groupTables), status: { $ne: "cancelled" } });
  }
  if (orders.length === 0) return res.status(400).json({ error: "ยังไม่มีออเดอร์สำหรับชำระเงิน" });

  if (itemRefs?.length) {
    const validItemKeys = new Set(
      orders.flatMap((order) => order.items.filter((item) => item.itemStatus !== "cancelled").map((item) => itemKey(order._id, item._id)))
    );
    const selectedItemKeys = itemRefs.map((ref) => itemKey(ref.orderId, ref.itemId));
    if (new Set(selectedItemKeys).size !== selectedItemKeys.length || !selectedItemKeys.every((key) => validItemKeys.has(key))) {
      return res.status(400).json({ error: "มีรายการอาหารที่เลือกไม่ถูกต้อง" });
    }
  }

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
  if (!isSubscriptionActive(restaurant)) return subscriptionError(res);
  if (!restaurant?.promptPayId) {
    return res.status(400).json({ error: "ร้านนี้ยังไม่ได้ตั้งค่า PromptPay" });
  }

  const groupTables = await resolveGroupTables(table);
  const groupTableIds = groupTables.map((t) => t._id);
  try {
    await ensureCheckoutAvailable(table, groupTables, "equal");
  } catch (error) {
    return sendPaymentConflict(res, error);
  }
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
  const { qrToken, headCount, adults, children, packageName, overtimeMinutes = 0 } = req.body;
  const legacyHeadCount = Number(headCount || 0);
  const adultCount = Number(adults ?? legacyHeadCount);
  const childCount = Number(children ?? 0);
  const extraMinutes = Number(overtimeMinutes);
  const totalGuests = adultCount + childCount;
  if (!Number.isInteger(adultCount) || !Number.isInteger(childCount) || adultCount < 0 || childCount < 0 || totalGuests < 1 || totalGuests > 50) {
    return res.status(400).json({ error: "จำนวนผู้ใหญ่/เด็กต้องรวมกันอยู่ระหว่าง 1-50 คน" });
  }
  if (!Number.isInteger(extraMinutes) || extraMinutes < 0 || extraMinutes % 30 !== 0) {
    return res.status(400).json({ error: "เวลาต่อเพิ่มต้องเป็น 0 หรือเพิ่มครั้งละ 30 นาที" });
  }

  const table = await Table.findOne({ qrToken });
  if (!table) return res.status(404).json({ error: "ไม่พบโต๊ะนี้" });

  const restaurant = await Restaurant.findById(table.restaurantId);
  if (!isSubscriptionActive(restaurant)) return subscriptionError(res);
  if (!restaurant?.promptPayId) {
    return res.status(400).json({ error: "ร้านนี้ยังไม่ได้ตั้งค่า PromptPay" });
  }
  if (restaurant.pricingMode !== "buffet") {
    return res.status(400).json({ error: "ร้านนี้ยังไม่ได้เปิดการชำระแบบบุฟเฟ่ต์รายหัว" });
  }

  const groupTables = await resolveGroupTables(table);
  const groupTableIds = groupTables.map((t) => t._id);
  try {
    await ensureCheckoutAvailable(table, groupTables, "buffet");
  } catch (error) {
    return sendPaymentConflict(res, error);
  }
  const orders = await Order.find({ ...sessionScopedTableFilter(groupTables), status: { $ne: "cancelled" } });
  const selectedPackage = restaurant.buffetPackages?.find((item) => item.name === packageName && item.isActive);
  const adultPrice = Number(selectedPackage?.adultPrice || restaurant.buffetAdultPrice || restaurant.buffetPricePerPerson);
  const childPrice = Number(selectedPackage?.childPrice ?? restaurant.buffetChildPrice ?? adultPrice);
  const packageDuration = Number(selectedPackage?.durationMinutes || restaurant.buffetDurationMinutes || 90);
  const overtimeRate = Number(selectedPackage?.overtimeFeePerPerson ?? restaurant.buffetOvertimeFeePerPerson ?? 0);
  if (!adultPrice || adultPrice <= 0) return res.status(400).json({ error: "ร้านยังไม่ได้ตั้งราคาบุฟเฟต์ผู้ใหญ่" });
  if (!Number.isFinite(childPrice) || childPrice < 0) return res.status(400).json({ error: "ราคาบุฟเฟต์เด็กไม่ถูกต้อง" });
  const overtimeFee = overtimeRate * totalGuests * (extraMinutes / 30);
  const deposit = Number(restaurant.buffetDepositPerPerson || 0) * totalGuests;
  const amount = +(adultPrice * adultCount + childPrice * childCount + overtimeFee + deposit).toFixed(2);

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
    note: `บุฟเฟ่ต์ ${selectedPackage?.name || "มาตรฐาน"}: ผู้ใหญ่ ${adultCount} เด็ก ${childCount} คน, ${packageDuration} นาที${extraMinutes ? `, ต่อเวลา ${extraMinutes} นาที` : ""}`,
  });

  table.status = "waiting_bill";
  await table.save();
  emitTableStatus(table.restaurantId, table);

  res.status(201).json({
    payment,
    breakdown: {
      headCount: totalGuests,
      adults: adultCount,
      children: childCount,
      buffetPricePerPerson: adultPrice,
      childPrice,
      overtimeFee,
      deposit,
      packageDuration,
      amount,
    },
  });
}

// POST /api/payment/manual (staff/cashier)
// Records a cash or card payment using the server-calculated table total.
export async function createManualPayment(req, res) {
  const { tableNumber, method, headCount } = req.body;
  if (!tableNumber || !["cash", "card"].includes(method)) {
    return res.status(400).json({ error: "กรุณาระบุโต๊ะและวิธีชำระเป็นเงินสดหรือบัตร" });
  }

  const table = await Table.findOne({ tableNumber: String(tableNumber).trim(), restaurantId: req.staff.restaurantId, isActive: true });
  if (!table) return res.status(404).json({ error: "ไม่พบโต๊ะนี้ในร้านของคุณ" });

  const restaurant = await Restaurant.findById(req.staff.restaurantId);
  const groupTables = await resolveGroupTables(table);
  const groupTableIds = groupTables.map((groupTable) => groupTable._id);

  try {
    await ensureCheckoutAvailable(table, groupTables, "full");
  } catch (error) {
    return sendPaymentConflict(res, error);
  }

  const orders = await Order.find({ ...sessionScopedTableFilter(groupTables), status: { $ne: "cancelled" } });
  const isBuffet = restaurant?.pricingMode === "buffet";
  const guests = Number(headCount);
  let amount;
  let splitType = "full";
  let note = "";

  if (isBuffet && (!Number.isInteger(guests) || guests < 1 || guests > 50)) {
    return res.status(400).json({ error: "กรุณาระบุจำนวนผู้ใหญ่/ผู้ทานบุฟเฟต์ 1-50 คน" });
  }

  if (isBuffet) {
    amount = +(restaurant.buffetPricePerPerson * guests).toFixed(2);
    splitType = "buffet";
    note = `บุฟเฟ่ต์รายหัว ${guests} คน`;
  } else {
    if (orders.length === 0) return res.status(400).json({ error: "โต๊ะนี้ยังไม่มีออเดอร์สำหรับชำระเงิน" });
    amount = (await computeAmount({ orders, restaurant })).amount;
  }

  if (!amount || amount <= 0) return res.status(400).json({ error: "ยอดชำระต้องมากกว่า 0" });

  const payment = await Payment.create({
    restaurantId: req.staff.restaurantId,
    tableId: table._id,
    tableIds: groupTableIds,
    orderIds: orders.map((order) => order._id),
    amount,
    method,
    status: "paid",
    splitType,
    splitIndex: 1,
    splitTotal: 1,
    receiptNumber: receiptNumber(),
    note,
    paidAt: new Date(),
  });

  const fullyPaid = await markOrdersPaidIfComplete(payment);
  if (fullyPaid) {
    for (const groupTable of groupTables) {
      groupTable.status = "cleaning";
      await groupTable.save();
      emitTableStatus(groupTable.restaurantId, groupTable);
    }
  }
  emitPaymentUpdated(payment.restaurantId, payment);
  res.status(201).json(payment);
}

// POST /api/payment/:id/confirm  (staff/cashier marks as paid manually, or webhook calls this)
export async function confirmPayment(req, res) {
  // Scope the lookup to the authenticated staff member's restaurant. Object IDs
  // must never be enough for staff from another restaurant to confirm a payment.
  const payment = await Payment.findOneAndUpdate(
    { _id: req.params.id, restaurantId: req.staff.restaurantId, status: "pending" },
    { status: "paid", paidAt: new Date() },
    { new: true }
  );
  if (!payment) {
    const existing = await Payment.findOne({ _id: req.params.id, restaurantId: req.staff.restaurantId }).select("status");
    if (!existing) return res.status(404).json({ error: "Payment not found" });
    return res.status(409).json({ error: `Payment is already ${existing.status}` });
  }

  const fullyPaid = await markOrdersPaidIfComplete(payment);

  // Keep a split bill at waiting_bill until every covered item is paid.
  if (fullyPaid) {
    const groupTables = await resolveGroupTables(await Table.findById(payment.tableId));
    for (const table of groupTables) {
      table.status = "cleaning";
      await table.save();
      emitTableStatus(table.restaurantId, table);
    }
  }

  emitPaymentUpdated(payment.restaurantId, payment);
  res.json(payment);
}

// GET /api/payment/table/:qrToken  (public - customer checks payment status; latest payments for this session)
export async function getPaymentByTable(req, res) {
  const table = await Table.findOne({ qrToken: req.params.qrToken });
  if (!table) return res.status(404).json({ error: "ไม่พบโต๊ะนี้" });
  const restaurant = await Restaurant.findById(table.restaurantId);
  if (!isSubscriptionActive(restaurant)) return subscriptionError(res);
  const groupTables = await resolveGroupTables(table);
  const payments = await Payment.find({
    tableIds: { $in: groupTables.map((t) => t._id) },
    createdAt: { $gte: sessionCutoff(table) },
  }).sort({ createdAt: -1 });
  res.json(payments);
}

// POST /api/payment/:id/close-table  (cashier closes table -> available + cleaning)
export async function closeTable(req, res) {
  // SECURITY: scope to the authenticated staff member's own restaurant, same
  // as every other staff-facing lookup in this file (see confirmPayment).
  // Without this, staff at restaurant A could close/reset a table at
  // restaurant B just by guessing/reusing a payment ObjectId.
  const payment = await Payment.findOne({ _id: req.params.id, restaurantId: req.staff.restaurantId });
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  const table = await Table.findOne({ _id: payment.tableId, restaurantId: req.staff.restaurantId });
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

  let subtotal;
  let serviceCharge = 0;
  let vat = 0;

  if (payment.splitType === "buffet") {
    subtotal = payment.amount;
  } else {
    subtotal = lineItems.reduce((s, i) => s + i.lineTotal, 0);
    serviceCharge = +(subtotal * (restaurant.serviceChargePercent / 100)).toFixed(2);
    vat = +((subtotal + serviceCharge) * (restaurant.vatPercent / 100)).toFixed(2);
  }

  res.json({
    receiptNumber: payment.receiptNumber,
    restaurant: {
      name: restaurant.name,
      displayName: restaurant.displayName,
      logoUrl: restaurant.logoUrl,
      taxId: restaurant.taxId || "",
      branchName: restaurant.branchName || "สำนักงานใหญ่",
      phone: restaurant.phone || "",
      address: restaurant.address || "",
    },
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
    note: payment.note || "",
    method: payment.method,
    status: payment.status,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
  });
}

// POST /api/payment/:id/slip  (public - customer attaches transfer slip image)
export async function uploadSlip(req, res) {
  const { slipUrl } = req.body || {};
  if (!slipUrl) {
    return res.status(400).json({ error: "กรุณาระบุ URL ของสลิปโอนเงิน" });
  }

  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error: "ไม่พบรายการชำระเงินนี้" });

  payment.slipUrl = slipUrl;
  payment.slipUploadedAt = new Date();
  await payment.save();

  const [restaurant, table] = await Promise.all([
    Restaurant.findById(payment.restaurantId),
    Table.findById(payment.tableId).select("tableNumber zone"),
  ]);

  // Notify staff via Socket.io
  emitPaymentUpdated(payment.restaurantId, payment);

  // Notify staff via LINE
  if (restaurant?.lineNotifyToken) {
    sendLineNotification(
      restaurant.lineNotifyToken,
      `\n💰 โต๊ะ ${table?.tableNumber || "-"} แนบสลิปโอนเงิน\nยอด: ฿${payment.amount}\nเวลา: ${new Date().toLocaleTimeString("th-TH")}\nกรุณาตรวจสอบในระบบ`
    );
  }

  res.json({ success: true, payment });
}
