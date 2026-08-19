<template>
  <header class="top-bar">
    <button class="back-btn" @click="goStatus">← กลับ</button>
    <h1 class="page-title">เช็คบิล / ชำระเงิน</h1>
    <span style="width:40px" />
  </header>

  <main class="bill-body">
    <div v-if="loadingSummary" class="loading-state">กำลังโหลดยอดบิล...</div>

    <template v-else>
      <!-- Step 1: choose how to pay -->
      <div v-if="!activePayments.length" class="mode-picker">
        <div v-if="billSummary.perTable?.length > 1" class="group-note card">
          <i class="fa-solid fa-link"></i> โต๊ะนี้ถูกรวมบิลกับ: {{ billSummary.perTable.map((t) => t.tableNumber).join(", ") }}
        </div>

        <div class="total-preview card">
          <span>ยอดค่าอาหารทั้งหมด</span>
          <strong>฿{{ billSummary.subtotal || 0 }}</strong>
        </div>

        <div class="mode-tabs">
          <button class="mode-tab" :class="{ active: mode === 'full' }" @click="mode = 'full'">จ่ายเต็มบิล</button>
          <button class="mode-tab" :class="{ active: mode === 'equal' }" @click="mode = 'equal'">หารเท่ากัน</button>
          <button v-if="billSummary.buffetEnabled" class="mode-tab" :class="{ active: mode === 'buffet' }" @click="mode = 'buffet'">บุฟเฟ่ต์รายหัว</button>
          <button class="mode-tab" :class="{ active: mode === 'items' }" @click="mode = 'items'">เลือกจ่ายรายการ</button>
        </div>

        <!-- full bill -->
        <div v-if="mode === 'full'" class="mode-panel card">
          <p class="mode-desc">ชำระค่าอาหารทั้งหมดในบิลนี้ในครั้งเดียว</p>
          <button class="btn-primary full-w" :disabled="requesting" @click="payFull">
            {{ requesting ? "กำลังสร้าง QR..." : `ขอ QR ชำระเต็มบิล · ฿${billSummary.subtotal}` }}
          </button>
        </div>

        <!-- split evenly -->
        <div v-if="mode === 'equal'" class="mode-panel card">
          <p class="mode-desc">หารยอดรวมเท่าๆ กันตามจำนวนคน แต่ละคนจะได้ QR ของตัวเอง</p>
          <div class="split-count-row">
            <button @click="splitCount = Math.max(2, splitCount - 1)">−</button>
            <span>{{ splitCount }} คน</span>
            <button @click="splitCount = Math.min(20, splitCount + 1)">+</button>
          </div>
          <p class="per-person">≈ ฿{{ estPerPerson }} / คน</p>
          <button class="btn-primary full-w" :disabled="requesting" @click="paySplit">
            {{ requesting ? "กำลังสร้าง QR..." : "สร้าง QR สำหรับทุกคน" }}
          </button>
        </div>

        <!-- buffet per head -->
        <div v-if="mode === 'buffet'" class="mode-panel card">
          <p class="mode-desc">ชำระแบบบุฟเฟ่ต์รายหัว ราคาต่อคน {{ billSummary.buffetPricePerPerson }} บาท</p>
          <div class="split-count-row">
            <button @click="buffetHeadCount = Math.max(1, buffetHeadCount - 1)">−</button>
            <span>{{ buffetHeadCount }} คน</span>
            <button @click="buffetHeadCount = Math.min(50, buffetHeadCount + 1)">+</button>
          </div>
          <p class="per-person">รวมทั้งหมด ≈ ฿{{ buffetTotal }} </p>
          <button class="btn-primary full-w" :disabled="requesting" @click="payBuffet">
            {{ requesting ? "กำลังสร้าง QR..." : `ชำระบุฟเฟ่ต์ · ฿${buffetTotal}` }}
          </button>
        </div>

        <!-- split by items -->
        <div v-if="mode === 'items'" class="mode-panel card">
          <p class="mode-desc">เลือกเฉพาะรายการที่ต้องการจ่าย (เหมาะกับการแยกจ่ายตามคนสั่ง)</p>
          <div v-for="order in billSummary.orders" :key="order._id" class="pick-order">
            <div class="pick-order-num">#{{ order.orderNumber }}</div>
            <label v-for="item in order.items" :key="item._id" class="pick-item">
              <input
                type="checkbox"
                :checked="isItemPicked(order._id, item._id)"
                @change="toggleItemPick(order._id, item._id)"
              />
              <span class="pick-item-name">{{ item.quantity }}x {{ item.name }}</span>
              <span class="pick-item-price">฿{{ item.lineTotal }}</span>
            </label>
          </div>
          <div class="picked-total">รวมที่เลือก: ฿{{ pickedTotal }}</div>
          <button class="btn-primary full-w" :disabled="requesting || pickedItems.length === 0" @click="payItems">
            {{ requesting ? "กำลังสร้าง QR..." : `ขอ QR ชำระ · ฿${pickedTotal}` }}
          </button>
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>
      </div>

      <!-- Step 2: show QR(s) -->
      <div v-else class="qr-results">
        <button class="btn-secondary back-to-modes" @click="resetToModePicker">← เลือกวิธีจ่ายใหม่</button>

        <div v-for="(p, idx) in activePayments" :key="p._id || idx" class="bill-card card">
          <div v-if="activePayments.length > 1" class="split-label">คนที่ {{ idx + 1 }} / {{ activePayments.length }}</div>
          <div class="amount-big">฿{{ p.amount }}</div>

          <template v-if="p.status !== 'paid'">
            <div class="qr-wrap">
              <canvas :ref="(el) => setCanvasRef(el, idx)"></canvas>
            </div>
            <p class="qr-hint">สแกนด้วยแอปธนาคารเพื่อชำระเงิน (PromptPay)</p>
          </template>
          <p v-else class="paid-check">✅</p>

          <span class="chip" :class="statusChip(p)">{{ statusLabel(p) }}</span>

          <router-link
            v-if="p.status === 'paid'"
            :to="{ name: 'receipt', params: { paymentId: p._id } }"
            class="receipt-link"
          >
            <i class="fa-solid fa-receipt"></i> ดูใบเสร็จ / พิมพ์ใบเสร็จ
          </router-link>
        </div>
      </div>
    </template>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import QRCode from "qrcode";
import api from "../api/client";
import socket from "../api/socket";
import { useTableStore } from "../stores/table";

const props = defineProps({ qrToken: String });
const router = useRouter();
const route = useRoute();
const tableStore = useTableStore();

const loadingSummary = ref(true);
const billSummary = ref({ orders: [], subtotal: 0, perTable: [] });
const mode = ref("full");
const splitCount = ref(2);
const buffetHeadCount = ref(1);
const pickedItems = ref([]); // [{orderId, itemId}]
const requesting = ref(false);
const error = ref(null);
const activePayments = ref([]);
const canvasRefs = ref({});

onMounted(async () => {
  if (!tableStore.table) await tableStore.loadTable(props.qrToken);
  await loadSummary();

  // came from "จ่ายออเดอร์นี้เลย" with a specific orderId in query
  const preselectOrderId = route.query.orderIds;
  if (preselectOrderId) {
    await payFull([preselectOrderId]);
  }

  // Live-update payment status (e.g. once staff confirms cash payment, or a
  // gateway webhook fires) so "รอชำระเงิน" flips to "ชำระเงินแล้ว" with a
  // receipt link, without the customer needing to refresh the page.
  socket.on("payment:updated", onPaymentUpdated);
});

onUnmounted(() => {
  socket.off("payment:updated", onPaymentUpdated);
});

function onPaymentUpdated(payment) {
  const idx = activePayments.value.findIndex((p) => p._id === payment._id);
  if (idx !== -1) activePayments.value[idx] = { ...activePayments.value[idx], ...payment };
}

async function loadSummary() {
  loadingSummary.value = true;
  try {
    const { data } = await api.get(`/table/qr/${props.qrToken}/bill-summary`);
    billSummary.value = data;
  } catch (err) {
    error.value = "โหลดยอดบิลไม่สำเร็จ";
  } finally {
    loadingSummary.value = false;
  }
}

const estPerPerson = computed(() => {
  const total = billSummary.value.subtotal || 0;
  return splitCount.value ? +(total / splitCount.value).toFixed(2) : 0;
});

const buffetTotal = computed(() => {
  const rate = Number(billSummary.value.buffetPricePerPerson || 0);
  return +(rate * buffetHeadCount.value).toFixed(2);
});

const pickedTotal = computed(() => {
  let total = 0;
  for (const pick of pickedItems.value) {
    const order = billSummary.value.orders.find((o) => o._id === pick.orderId);
    const item = order?.items.find((i) => i._id === pick.itemId);
    if (item) total += item.lineTotal;
  }
  return total;
});

function isItemPicked(orderId, itemId) {
  return pickedItems.value.some((p) => p.orderId === orderId && p.itemId === itemId);
}
function toggleItemPick(orderId, itemId) {
  if (isItemPicked(orderId, itemId)) {
    pickedItems.value = pickedItems.value.filter((p) => !(p.orderId === orderId && p.itemId === itemId));
  } else {
    pickedItems.value.push({ orderId, itemId });
  }
}

async function payFull(orderIdsOverride) {
  requesting.value = true;
  error.value = null;
  try {
    const body = { qrToken: props.qrToken };
    if (orderIdsOverride) body.orderIds = orderIdsOverride;
    const { data } = await api.post("/payment/promptpay", body);
    activePayments.value = [data.payment];
    await nextTick();
    renderAllQr();
  } catch (err) {
    error.value = err.response?.data?.error || "สร้าง QR ไม่สำเร็จ";
  } finally {
    requesting.value = false;
  }
}

async function paySplit() {
  requesting.value = true;
  error.value = null;
  try {
    const { data } = await api.post("/payment/split", { qrToken: props.qrToken, splitCount: splitCount.value });
    activePayments.value = data.payments;
    await nextTick();
    renderAllQr();
  } catch (err) {
    error.value = err.response?.data?.error || "สร้าง QR ไม่สำเร็จ";
  } finally {
    requesting.value = false;
  }
}

async function payBuffet() {
  requesting.value = true;
  error.value = null;
  try {
    const { data } = await api.post("/payment/buffet", { qrToken: props.qrToken, headCount: buffetHeadCount.value });
    activePayments.value = [data.payment];
    await nextTick();
    renderAllQr();
  } catch (err) {
    error.value = err.response?.data?.error || "สร้าง QR บุฟเฟ่ต์ไม่สำเร็จ";
  } finally {
    requesting.value = false;
  }
}

async function payItems() {
  requesting.value = true;
  error.value = null;
  try {
    const { data } = await api.post("/payment/promptpay", { qrToken: props.qrToken, itemRefs: pickedItems.value });
    activePayments.value = [data.payment];
    await nextTick();
    renderAllQr();
  } catch (err) {
    error.value = err.response?.data?.error || "สร้าง QR ไม่สำเร็จ";
  } finally {
    requesting.value = false;
  }
}

function setCanvasRef(el, idx) {
  if (el) canvasRefs.value[idx] = el;
}

function renderAllQr() {
  activePayments.value.forEach((p, idx) => {
    const el = canvasRefs.value[idx];
    if (el && p.promptPayPayload) QRCode.toCanvas(el, p.promptPayPayload, { width: 220, margin: 1 });
  });
}

function statusLabel(p) {
  if (p.status === "paid") return "ชำระเงินแล้ว";
  if (p.status === "failed") return "ชำระเงินไม่สำเร็จ";
  return "รอการชำระเงิน";
}
function statusChip(p) {
  if (p.status === "paid") return "chip-done";
  if (p.status === "failed") return "chip-cancelled";
  return "chip-pending";
}

function resetToModePicker() {
  activePayments.value = [];
  pickedItems.value = [];
  loadSummary();
}

function goStatus() {
  router.push({ name: "status", params: { qrToken: props.qrToken } });
}
</script>

<style scoped>
.back-btn {
  background: none;
  color: var(--cream);
  font-weight: 600;
  font-size: 14px;
}
.page-title {
  color: var(--cream);
  font-size: 17px;
}
.bill-body {
  padding: 16px 18px 40px;
}
.loading-state {
  padding: 60px 20px;
  text-align: center;
  color: #6b7268;
}
.group-note {
  padding: 12px 14px;
  font-size: 13px;
  margin-bottom: 12px;
  color: var(--forest-deep);
}
.total-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  margin-bottom: 16px;
  font-size: 14px;
}
.total-preview strong {
  font-family: "Chonburi", serif;
  font-size: 20px;
  color: var(--marigold-deep);
}
.mode-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.mode-tab {
  flex: 1;
  background: var(--cream);
  color: var(--forest);
  padding: 10px 6px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 700;
}
.mode-tab.active {
  background: var(--forest);
  color: var(--cream);
}
.mode-panel {
  padding: 18px;
}
.mode-desc {
  font-size: 12.5px;
  color: #6b7268;
  margin: 0 0 14px;
}
.full-w {
  width: 100%;
}
.split-count-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: var(--cream);
  border-radius: 10px;
  padding: 12px;
  font-weight: 700;
  font-size: 16px;
}
.split-count-row button {
  background: var(--forest);
  color: var(--cream);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 18px;
}
.per-person {
  text-align: center;
  color: var(--marigold-deep);
  font-weight: 700;
  margin: 12px 0;
}
.pick-order {
  margin-bottom: 14px;
}
.pick-order-num {
  font-weight: 700;
  font-size: 12.5px;
  color: var(--forest-deep);
  margin-bottom: 6px;
}
.pick-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--line);
}
.pick-item-name {
  flex: 1;
}
.pick-item-price {
  color: var(--marigold-deep);
  font-weight: 600;
}
.picked-total {
  text-align: right;
  font-weight: 700;
  margin: 12px 0;
  font-size: 15px;
}
.error-text {
  color: var(--chili);
  font-size: 13px;
  margin-top: 10px;
}
.qr-results {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.back-to-modes {
  align-self: flex-start;
}
.bill-card {
  padding: 20px;
  text-align: center;
}
.split-label {
  font-weight: 700;
  color: var(--forest-deep);
  margin-bottom: 8px;
  font-size: 13px;
}
.amount-big {
  font-family: "Chonburi", serif;
  font-size: 22px;
  color: var(--marigold-deep);
  margin-bottom: 10px;
}
.qr-wrap {
  display: flex;
  justify-content: center;
  margin: 6px 0;
}
.qr-hint {
  font-size: 12px;
  color: #6b7268;
  margin: 8px 0 10px;
}
.paid-check {
  font-size: 40px;
  margin: 10px 0;
}
.receipt-link {
  display: inline-block;
  margin-top: 14px;
  color: var(--forest);
  font-weight: 700;
  font-size: 13px;
  text-decoration: underline;
}
</style>
