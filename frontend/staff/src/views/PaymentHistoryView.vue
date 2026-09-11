<template>
  <div class="page">
    <header class="page-header">
      <h2 class="display">ประวัติการชำระเงิน</h2>
    </header>

    <div class="filters card">
      <div class="filter-field">
        <label>สถานะ</label>
        <select v-model="payments.filters.status">
          <option value="">ทั้งหมด</option>
          <option value="paid">จ่ายแล้ว</option>
          <option value="pending">รอชำระ</option>
          <option value="failed">ไม่สำเร็จ</option>
        </select>
      </div>
      <div class="filter-field">
        <label>วิธีชำระ</label>
        <select v-model="payments.filters.method">
          <option value="">ทั้งหมด</option>
          <option value="promptpay">PromptPay</option>
          <option value="cash">เงินสด</option>
          <option value="card">บัตร</option>
        </select>
      </div>
      <div class="filter-field">
        <label>จากวันที่</label>
        <input v-model="payments.filters.from" type="date" />
      </div>
      <div class="filter-field">
        <label>ถึงวันที่</label>
        <input v-model="payments.filters.to" type="date" />
      </div>
      <button class="btn btn-accent" @click="payments.loadHistory">ค้นหา</button>
    </div>

    <div class="summary-bar">
      <div class="summary-item">
        <div class="s-label">รายการทั้งหมด</div>
        <div class="s-value">{{ payments.payments.length }}</div>
      </div>
      <div class="summary-item">
        <div class="s-label">ยอดที่ชำระแล้ว</div>
        <div class="s-value accent">฿{{ payments.totalPaid.toLocaleString() }}</div>
      </div>
    </div>
    <p v-if="payments.error" class="error-text">{{ payments.error }}</p>

    <div v-if="payments.loading" class="empty">กำลังโหลด...</div>
    <div v-else-if="payments.payments.length === 0" class="empty">ไม่พบรายการชำระเงิน</div>

    <table v-else class="pay-table">
      <thead>
        <tr>
          <th>เลขที่ใบเสร็จ</th>
          <th>โต๊ะ</th>
          <th>วิธีชำระ</th>
          <th>ประเภท</th>
          <th>จำนวนเงิน</th>
          <th>สลิป</th>
          <th>สถานะ</th>
          <th>วันที่</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in payments.payments" :key="p._id">
          <td class="mono">{{ p.receiptNumber || "-" }}</td>
          <td>{{ p.tableId?.tableNumber || "-" }}</td>
          <td>{{ methodLabel(p.method) }}</td>
          <td>{{ splitLabel(p) }}</td>
          <td class="amount">฿{{ p.amount.toLocaleString() }}</td>
          <td>
            <button v-if="p.slipUrl" class="btn-slip-view" @click="activeSlip = p">
              <i class="fa-solid fa-image"></i> ดูสลิป
            </button>
            <span v-else class="no-slip">-</span>
          </td>
          <td><span class="chip" :class="`chip-${p.status}`">{{ statusLabel(p.status) }}</span></td>
          <td class="mono small-text">{{ formatDate(p.createdAt) }}</td>
          <td class="row-actions">
            <button v-if="p.status === 'pending'" class="btn small btn-accent" :disabled="payments.confirmingId === p._id" @click="confirmPayment(p)">
              {{ payments.confirmingId === p._id ? "กำลังยืนยัน..." : "ยืนยันจ่ายแล้ว" }}
            </button>
            <a class="btn small" :href="`/receipt/${p._id}`" target="_blank" rel="noopener"><i class="fa-solid fa-receipt"></i> ใบเสร็จ</a>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Slip Viewer Modal -->
    <div v-if="activeSlip" class="modal-backdrop" @click.self="activeSlip = null">
      <div class="modal card slip-modal">
        <div class="modal-head">
          <h3><i class="fa-solid fa-receipt"></i> ตรวจสอบสลิปโอนเงิน</h3>
          <button class="close-btn" @click="activeSlip = null">✕</button>
        </div>
        <div class="slip-modal-body">
          <div class="slip-modal-meta">
            <div><strong>โต๊ะ:</strong> {{ activeSlip.tableId?.tableNumber || "-" }}</div>
            <div><strong>ยอดชำระ:</strong> <span class="amount">฿{{ activeSlip.amount.toLocaleString() }}</span></div>
            <div><strong>เวลาแนบสลิป:</strong> {{ formatDate(activeSlip.slipUploadedAt || activeSlip.updatedAt) }}</div>
          </div>
          <div class="slip-modal-img-wrap">
            <img :src="activeSlip.slipUrl" alt="สลิปโอนเงิน" class="slip-modal-img" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn" @click="activeSlip = null">ปิด</button>
          <button
            v-if="activeSlip.status === 'pending'"
            class="btn btn-accent"
            :disabled="payments.confirmingId === activeSlip._id"
            @click="confirmFromModal"
          >
            <i class="fa-solid fa-check"></i> ยืนยันยอดเงินถูกต้อง
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { usePaymentsStore } from "../stores/payments";

const payments = usePaymentsStore();
const activeSlip = ref(null);

onMounted(() => payments.loadHistory());

const METHOD_LABELS = { promptpay: "PromptPay", cash: "เงินสด", card: "บัตร" };
const STATUS_LABELS = { paid: "จ่ายแล้ว", pending: "รอชำระ", failed: "ไม่สำเร็จ" };
const SPLIT_LABELS = { full: "เต็มบิล", equal: "หารเท่ากัน", items: "เลือกรายการ" };

function methodLabel(m) {
  return METHOD_LABELS[m] || m;
}
function statusLabel(s) {
  return STATUS_LABELS[s] || s;
}
function splitLabel(p) {
  const base = SPLIT_LABELS[p.splitType] || p.splitType;
  return p.splitType === "equal" && p.splitTotal ? `${base} (${p.splitIndex}/${p.splitTotal})` : base;
}
function formatDate(d) {
  return new Date(d).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
}
async function confirmPayment(payment) {
  if (!confirm(`ยืนยันว่าได้รับชำระเงิน ${payment.amount.toLocaleString()} บาท สำหรับ ${payment.receiptNumber || "รายการนี้"} แล้ว?`)) return;
  await payments.confirmPayment(payment._id);
}

async function confirmFromModal() {
  if (!activeSlip.value) return;
  await payments.confirmPayment(activeSlip.value._id);
  activeSlip.value = null;
}
</script>

<style scoped>
h2 {
  font-size: 22px;
  color: var(--accent);
  margin-bottom: 20px;
}
.filters {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: flex-end;
  padding: 16px;
  margin-bottom: 18px;
}
.filter-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.filter-field label {
  font-size: 11.5px;
  color: var(--muted);
}
.filter-field select,
.filter-field input {
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
}
.summary-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 18px;
}
.summary-item {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 20px;
}
.s-label {
  font-size: 11.5px;
  color: var(--muted);
}
.s-value {
  font-size: 20px;
  font-weight: 700;
  margin-top: 4px;
}
.s-value.accent {
  color: var(--accent);
}
.empty {
  color: var(--muted);
  padding: 40px 0;
}
.error-text { color: var(--danger); margin: 0 0 14px; font-size: 13px; }
.pay-table { display: table; }
@media (max-width: 800px) {
  .pay-table { min-width: 780px; }
  .page { overflow-x: auto; }
}
.pay-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.pay-table th {
  text-align: left;
  color: var(--muted);
  font-weight: 600;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 11.5px;
}
.pay-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
}
.amount {
  font-weight: 700;
  color: var(--accent);
}
.small-text {
  font-size: 11.5px;
  color: var(--muted);
}
.btn.small {
  padding: 5px 10px;
  font-size: 11.5px;
}
.row-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.row-actions a.btn {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.btn-slip-view {
  background: rgba(46, 117, 89, 0.18);
  color: #2ecc71;
  border: 1px solid rgba(46, 117, 89, 0.4);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.btn-slip-view:hover {
  background: rgba(46, 117, 89, 0.3);
}
.no-slip {
  color: var(--muted);
}

.slip-modal {
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.modal-head h3 {
  font-size: 16px;
  color: var(--accent);
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}
.close-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 18px;
  cursor: pointer;
}
.slip-modal-body {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.slip-modal-meta {
  background: var(--panel-2);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.slip-modal-img-wrap {
  text-align: center;
  background: #000;
  border-radius: 8px;
  padding: 8px;
}
.slip-modal-img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 4px;
}
</style>
