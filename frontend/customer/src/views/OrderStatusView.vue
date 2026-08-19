<template>
  <header class="top-bar">
    <button class="back-btn" @click="goMenu">← เมนู</button>
    <h1 class="page-title">สถานะออเดอร์</h1>
    <span style="width:40px" />
  </header>

  <main class="status-body">
    <div v-if="tableStore.orders.length === 0" class="empty-state">
      <p>ยังไม่มีออเดอร์</p>
      <button class="btn-primary" @click="goMenu">สั่งอาหารเลย</button>
    </div>

    <div v-for="order in [...tableStore.orders].reverse()" :key="order._id" class="order-card card">
      <div class="order-head">
        <span class="order-num">#{{ order.orderNumber }}</span>
        <span class="chip" :class="`chip-${order.status}`">{{ statusLabel(order.status) }}</span>
      </div>
      <div v-for="item in order.items" :key="item._id" class="order-item">
        <div class="item-left">
          <div class="item-name">{{ item.quantity }}x {{ item.name }}</div>
          <div v-if="item.selectedOptions?.length" class="item-opts">
            {{ item.selectedOptions.map((o) => o.choice).join(", ") }}
          </div>
        </div>
        <span class="chip" :class="`chip-${item.itemStatus}`">{{ itemStatusLabel(item.itemStatus) }}</span>
      </div>
      <div class="order-total">รวม ฿{{ order.subtotal }}</div>
      <button
        v-if="order.status !== 'cancelled' && !isOrderPaid(order)"
        class="pay-now-btn"
        @click="payOrderNow(order)"
      >
        <i class="fa-solid fa-credit-card"></i> จ่ายออเดอร์นี้เลย
      </button>
    </div>
  </main>

  <div class="bottom-nav">
    <button class="btn-secondary" style="flex:1" @click="goMenu">สั่งเพิ่ม</button>
    <button class="btn-primary" style="flex:1" @click="goBill" :disabled="tableStore.orders.length === 0">
      <i class="fa-solid fa-credit-card"></i> เช็คบิลรวม
    </button>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useTableStore } from "../stores/table";

const props = defineProps({ qrToken: String });
const router = useRouter();
const tableStore = useTableStore();

onMounted(async () => {
  if (!tableStore.table) await tableStore.loadTable(props.qrToken);
});

const STATUS_LABELS = {
  pending: "รอรับออเดอร์",
  accepted: "รับออเดอร์แล้ว",
  cooking: "กำลังทำ",
  served: "เสิร์ฟแล้ว",
  cancelled: "ยกเลิก",
};
const ITEM_STATUS_LABELS = {
  new: "รอรับ",
  accepted: "รับแล้ว",
  cooking: "กำลังทำ",
  done: "เสร็จแล้ว",
  cancelled: "ยกเลิก",
};

function statusLabel(s) {
  return STATUS_LABELS[s] || s;
}
function itemStatusLabel(s) {
  return ITEM_STATUS_LABELS[s] || s;
}
function isOrderPaid(order) {
  return order.status === "served" && tableStore.orders.every((o) => o._id !== order._id || o.status === "served");
}

function goMenu() {
  router.push({ name: "menu", params: { qrToken: props.qrToken } });
}
function goBill() {
  router.push({ name: "bill", params: { qrToken: props.qrToken } });
}
function payOrderNow(order) {
  router.push({ name: "bill", params: { qrToken: props.qrToken }, query: { orderIds: order._id } });
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
.status-body {
  padding: 16px 18px 100px;
}
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7268;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}
.order-card {
  padding: 14px;
  margin-bottom: 12px;
}
.order-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--line);
}
.order-num {
  font-weight: 700;
  font-family: "Chonburi", serif;
  color: var(--forest-deep);
}
.order-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 6px 0;
  gap: 8px;
}
.item-name {
  font-size: 13.5px;
  font-weight: 600;
}
.item-opts {
  font-size: 12px;
  color: #6b7268;
  margin-top: 2px;
}
.order-total {
  text-align: right;
  font-weight: 700;
  color: var(--marigold-deep);
  margin-top: 10px;
  font-size: 14px;
}
.pay-now-btn {
  width: 100%;
  margin-top: 10px;
  background: var(--marigold);
  color: var(--forest-deep);
  font-weight: 700;
  padding: 10px;
  font-size: 13px;
  border-radius: 10px;
}
</style>
