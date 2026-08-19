<template>
  <div v-if="loading" class="loading-state">กำลังโหลดใบเสร็จ...</div>
  <div v-else-if="error" class="loading-state error">{{ error }}</div>

  <template v-else>
    <header class="top-bar no-print">
      <button class="back-btn" @click="goBack">← กลับ</button>
      <h1 class="page-title">ใบเสร็จ</h1>
      <span style="width:40px" />
    </header>

    <main class="receipt-wrap">
      <div class="receipt-paper" id="receipt-paper">
        <div class="r-header">
          <h2 class="r-shop-name display">{{ receipt.restaurant.name }}</h2>
          <p class="r-sub">ใบเสร็จอิเล็กทรอนิกส์ / E-Receipt</p>
        </div>

        <div class="r-divider" />

        <div class="r-meta">
          <div class="r-meta-row"><span>เลขที่ใบเสร็จ</span><span>{{ receipt.receiptNumber || "-" }}</span></div>
          <div class="r-meta-row"><span>โต๊ะ</span><span>{{ receipt.tableNumbers.join(", ") }}</span></div>
          <div class="r-meta-row"><span>วันที่</span><span>{{ formatDate(receipt.paidAt || receipt.createdAt) }}</span></div>
          <div class="r-meta-row"><span>วิธีชำระ</span><span>{{ methodLabel(receipt.method) }}</span></div>
          <div class="r-meta-row">
            <span>สถานะ</span>
            <span class="chip" :class="receipt.status === 'paid' ? 'chip-done' : 'chip-pending'">
              {{ receipt.status === "paid" ? "ชำระเงินแล้ว" : "รอชำระเงิน" }}
            </span>
          </div>
          <div v-if="receipt.splitType === 'equal'" class="r-meta-row split-note">
            <span>ส่วนแบ่งบิล</span><span>คนที่ {{ receipt.splitIndex }} / {{ receipt.splitTotal }} คน</span>
          </div>
        </div>

        <div class="r-divider dashed" />

        <div class="r-items">
          <div class="r-items-head">
            <span>รายการ</span>
            <span>ยอดรวม</span>
          </div>
          <div v-for="(item, idx) in receipt.items" :key="idx" class="r-item">
            <div class="r-item-main">
              <span>{{ item.quantity }}x {{ item.name }}</span>
              <span>฿{{ item.lineTotal }}</span>
            </div>
            <div v-if="item.options?.length" class="r-item-opts">{{ item.options.join(", ") }}</div>
          </div>
        </div>

        <div class="r-divider dashed" />

        <div class="r-totals">
          <div class="r-total-row"><span>ยอดรวมย่อย{{ receipt.splitType === "equal" ? " (ทั้งโต๊ะ)" : "" }}</span><span>฿{{ receipt.subtotal }}</span></div>
          <div v-if="receipt.serviceCharge" class="r-total-row"><span>ค่าบริการ</span><span>฿{{ receipt.serviceCharge }}</span></div>
          <div v-if="receipt.vat" class="r-total-row"><span>ภาษีมูลค่าเพิ่ม</span><span>฿{{ receipt.vat }}</span></div>
          <div v-if="receipt.splitType === 'equal'" class="r-total-row">
            <span>หารเท่ากัน {{ receipt.splitTotal }} คน</span>
            <span>÷ {{ receipt.splitTotal }}</span>
          </div>
          <div class="r-total-row grand">
            <span>{{ receipt.splitType === "equal" ? "ยอดที่ต้องชำระ (ส่วนของคุณ)" : "ยอดชำระทั้งหมด" }}</span>
            <span>฿{{ receipt.amount }}</span>
          </div>
        </div>

        <div class="r-divider" />

        <p class="r-footer">ขอบคุณที่ใช้บริการ <i class="fa-solid fa-hands-praying"></i></p>
      </div>

      <button class="btn-primary print-btn no-print" @click="printReceipt"><i class="fa-solid fa-print"></i> พิมพ์ใบเสร็จ</button>
    </main>
  </template>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import api from "../api/client";

const props = defineProps({ paymentId: String });
const router = useRouter();

const loading = ref(true);
const error = ref(null);
const receipt = ref(null);

onMounted(async () => {
  try {
    const { data } = await api.get(`/payment/${props.paymentId}/receipt`);
    receipt.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || "ไม่พบใบเสร็จนี้";
  } finally {
    loading.value = false;
  }
});

const METHOD_LABELS = { promptpay: "PromptPay", cash: "เงินสด", card: "บัตร" };
function methodLabel(m) {
  return METHOD_LABELS[m] || m;
}
function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function printReceipt() {
  window.print();
}

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push("/");
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
.loading-state {
  padding: 60px 20px;
  text-align: center;
  color: #6b7268;
}
.loading-state.error {
  color: var(--chili);
}
.receipt-wrap {
  padding: 20px 18px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.receipt-paper {
  width: 100%;
  max-width: 340px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 24px 20px;
  font-family: "JetBrains Mono", "Noto Sans Thai", monospace;
}
.r-header {
  text-align: center;
}
.r-shop-name {
  font-size: 19px;
  color: var(--forest-deep);
}
.r-sub {
  font-size: 11px;
  color: #6b7268;
  margin: 4px 0 0;
}
.r-divider {
  border-top: 1.5px solid var(--ink);
  margin: 14px 0;
}
.r-divider.dashed {
  border-top: 1.5px dashed var(--line);
}
.r-meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
}
.r-meta-row.split-note {
  font-weight: 700;
  color: var(--marigold-deep);
}
.r-items-head {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #6b7268;
  margin-bottom: 8px;
  font-weight: 700;
}
.r-item {
  margin-bottom: 8px;
}
.r-item-main {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
}
.r-item-opts {
  font-size: 11px;
  color: #6b7268;
  padding-left: 12px;
  margin-top: 1px;
}
.r-total-row {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  padding: 3px 0;
}
.r-total-row.grand {
  font-weight: 800;
  font-size: 16px;
  color: var(--marigold-deep);
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
}
.r-footer {
  text-align: center;
  font-size: 13px;
  color: var(--forest-deep);
  margin: 0;
}
.print-btn {
  margin-top: 20px;
  width: 100%;
  max-width: 340px;
}

@media print {
  .no-print {
    display: none !important;
  }
  .receipt-wrap {
    padding: 0;
  }
  .receipt-paper {
    border: none;
    max-width: 100%;
    padding: 0;
  }
}
</style>
