<template>
  <div class="board">
    <header class="board-header">
      <h1 class="display"><i class="fa-solid fa-burger"></i> Kitchen Display</h1>

      <nav class="station-tabs">
        <button
          v-for="s in stations"
          :key="s.value"
          class="station-tab"
          :class="{ active: kitchen.station === s.value }"
          @click="kitchen.station = s.value"
        >
          {{ s.label }}
        </button>
      </nav>

      <div class="header-right">
        <span class="clock mono">{{ now }}</span>
        <button class="sound-btn" @click="kitchen.soundEnabled = !kitchen.soundEnabled">
          <i :class="['fa-solid', kitchen.soundEnabled ? 'fa-bell' : 'fa-bell-slash']"></i>
        </button>
      </div>
    </header>

    <main class="cards-grid">
      <p v-if="kitchen.visibleOrders.length === 0" class="empty">ยังไม่มีออเดอร์ใหม่</p>

      <div
        v-for="order in sortedOrders"
        :key="order._id"
        class="order-card"
        :class="urgencyClass(order.createdAt)"
      >
        <div class="card-top">
          <span class="order-num mono">#{{ order.orderNumber }}</span>
          <span class="timer mono">{{ elapsed(order.createdAt) }}</span>
        </div>
        <div class="table-label">โต๊ะ {{ order.tableNumber || "" }}</div>

        <div v-for="item in order.items" :key="item._id" class="item-row" :class="`status-${item.itemStatus}`">
          <div class="item-info">
            <div class="item-qty-name">{{ item.quantity }}x {{ item.name }}</div>
            <div v-if="item.selectedOptions?.length" class="item-opts">
              {{ item.selectedOptions.map((o) => o.choice).join(", ") }}
            </div>
            <div v-if="item.note" class="item-note"><i class="fa-solid fa-note-sticky"></i> {{ item.note }}</div>
          </div>

          <div class="item-actions">
            <button
              v-if="item.itemStatus === 'new'"
              class="act-btn accept"
              @click="update(order._id, item._id, 'accepted')"
            >
              รับออเดอร์
            </button>
            <button
              v-if="item.itemStatus === 'accepted'"
              class="act-btn cooking"
              @click="update(order._id, item._id, 'cooking')"
            >
              เริ่มทำ
            </button>
            <button
              v-if="item.itemStatus === 'cooking'"
              class="act-btn done"
              @click="update(order._id, item._id, 'done')"
            >
              เสร็จแล้ว
            </button>
            <span v-if="item.itemStatus === 'done'" class="done-label">✓ เสร็จแล้ว</span>
            <button
              v-if="item.itemStatus !== 'done' && item.itemStatus !== 'cancelled'"
              class="act-btn cancel"
              @click="update(order._id, item._id, 'cancelled')"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useKitchenStore } from "../stores/kitchen";

const kitchen = useKitchenStore();

const stations = [
  { value: "all", label: "ทั้งหมด" },
  { value: "kitchen", label: "ครัว" },
  { value: "grill", label: "Grill" },
  { value: "drink", label: "เครื่องดื่ม" },
  { value: "dessert", label: "ของหวาน" },
];

const now = ref(formatClock(new Date()));
let clockInterval, tickInterval;

onMounted(async () => {
  await kitchen.loadOrders();
  kitchen.connectSocket();
  clockInterval = setInterval(() => (now.value = formatClock(new Date())), 1000);
  tickInterval = setInterval(() => (tick.value += 1), 1000);
});
onUnmounted(() => {
  clearInterval(clockInterval);
  clearInterval(tickInterval);
});

const tick = ref(0); // forces re-render of elapsed timers every second

const sortedOrders = computed(() => {
  tick.value; // dependency
  return [...kitchen.visibleOrders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
});

function elapsed(createdAt) {
  const diffSec = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  const m = Math.floor(diffSec / 60);
  const s = diffSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function urgencyClass(createdAt) {
  const diffMin = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (diffMin > 15) return "urgent";
  if (diffMin > 8) return "warn";
  return "";
}

function formatClock(d) {
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

async function update(orderId, itemId, status) {
  await kitchen.updateItemStatus(orderId, itemId, status);
}
</script>

<style scoped>
.board {
  min-height: 100%;
}
.board-header {
  position: sticky;
  top: -24px;
  z-index: 5;
  background: var(--bg);
  padding: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  margin: -24px -28px 14px;
  padding: 20px 28px 14px;
  border-bottom: 1px solid var(--line);
}
.board-header h1 {
  font-size: 20px;
  color: var(--accent);
  white-space: nowrap;
}
.station-tabs {
  display: flex;
  gap: 8px;
  flex: 1;
  flex-wrap: wrap;
}
.station-tab {
  background: var(--panel-2);
  color: var(--muted);
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 999px;
}
.station-tab.active {
  background: var(--accent);
  color: #1d1200;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.clock {
  color: var(--muted);
  font-size: 14px;
}
.sound-btn {
  background: var(--panel-2);
  font-size: 16px;
  padding: 6px 10px;
}
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.empty {
  color: var(--muted);
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px;
}
.order-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px;
  border-left: 4px solid var(--info);
}
.order-card.warn {
  border-left-color: var(--accent);
}
.order-card.urgent {
  border-left-color: var(--danger);
  animation: pulse 1.6s infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 rgba(224, 83, 61, 0); }
  50% { box-shadow: 0 0 0 3px rgba(224, 83, 61, 0.25); }
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.order-num {
  font-weight: 700;
  font-size: 15px;
}
.timer {
  color: var(--accent);
  font-size: 14px;
  font-weight: 700;
}
.table-label {
  color: var(--muted);
  font-size: 12px;
  margin: 2px 0 10px;
}
.item-row {
  border-top: 1px solid var(--line);
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.item-row.status-done {
  opacity: 0.45;
}
.item-qty-name {
  font-weight: 600;
  font-size: 14px;
}
.item-opts {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}
.item-note {
  font-size: 12px;
  color: var(--accent);
  margin-top: 2px;
}
.item-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.act-btn {
  font-size: 12px;
  font-weight: 700;
  padding: 7px 12px;
  color: #14161a;
}
.act-btn.accept { background: var(--info); color: #fff; }
.act-btn.cooking { background: var(--accent); }
.act-btn.done { background: var(--success); color: #fff; }
.act-btn.cancel { background: var(--panel-2); color: var(--danger); }
.done-label {
  color: var(--success);
  font-weight: 700;
  font-size: 13px;
}
</style>
