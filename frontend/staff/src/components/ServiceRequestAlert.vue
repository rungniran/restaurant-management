<template>
  <!-- Floating bell badge -->
  <button
    v-if="tablesStore.pendingServiceRequests.length > 0"
    class="bell-fab"
    :class="{ 'bell-pulse': hasNew }"
    @click="isOpen = !isOpen"
    aria-label="แจ้งเตือนเรียกพนักงาน"
  >
    <i class="fa-solid fa-bell"></i>
    <span class="bell-count">{{ tablesStore.pendingServiceRequests.length }}</span>
  </button>

  <!-- Dropdown panel -->
  <Transition name="slide-down">
    <div v-if="isOpen && tablesStore.pendingServiceRequests.length > 0" class="service-panel">
      <div class="panel-header">
        <span><i class="fa-solid fa-bell"></i> เรียกพนักงาน</span>
        <button class="close-btn" @click="isOpen = false">✕</button>
      </div>
      <div class="panel-list">
        <div
          v-for="req in tablesStore.pendingServiceRequests"
          :key="req._id"
          class="req-card"
        >
          <div class="req-info">
            <span class="req-table">
              <i class="fa-solid fa-chair"></i>
              โต๊ะ {{ req.tableId?.tableNumber || req.tableId }}
              <span v-if="req.tableId?.zone" class="req-zone">({{ req.tableId.zone }})</span>
            </span>
            <span class="req-type">{{ typeLabel(req.type) }}</span>
            <span v-if="req.note" class="req-note">"{{ req.note }}"</span>
            <span class="req-time">{{ timeAgo(req.createdAt) }}</span>
          </div>
          <button class="ack-btn" @click="acknowledge(req._id)">
            <i class="fa-solid fa-check"></i> รับทราบ
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { useTablesStore } from "../stores/tables";
import api from "../api/client";

const tablesStore = useTablesStore();
const isOpen = ref(false);
const hasNew = ref(false);
let audioCtx = null;

function playChime() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.5);
  } catch {
    // Audio not supported or blocked by browser
  }
}

watch(
  () => tablesStore.pendingServiceRequests.length,
  (newLen, oldLen) => {
    if (newLen > oldLen) {
      playChime();
      hasNew.value = true;
      isOpen.value = true;
      setTimeout(() => (hasNew.value = false), 3000);
    }
  }
);

onMounted(async () => {
  // try {
  //   const { data } = await api.get("/service-request");
  //   tablesStore.pendingServiceRequests = data;
  // } catch {
  //   // ignore
  // }
});

async function acknowledge(id) {
  await tablesStore.acknowledgeServiceRequest(id);
  if (tablesStore.pendingServiceRequests.length === 0) isOpen.value = false;
}

function typeLabel(type) {
  const labels = {
    call_staff: "เรียกพนักงาน",
    order_more: "สั่งเพิ่ม",
    check_bill: "เช็คบิล",
    water: "ขอน้ำ",
  };
  return labels[type] || type;
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff} วินาทีที่แล้ว`;
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
}
</script>

<style scoped>
.bell-fab {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 900;
  background: #c0392b;
  color: #fff;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  font-size: 22px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
}
.bell-count {
  position: absolute;
  top: 6px;
  right: 6px;
  background: #fff;
  color: #c0392b;
  font-size: 10px;
  font-weight: 800;
  border-radius: 999px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
.bell-pulse {
  animation: pulse 0.6s ease-in-out infinite alternate;
}
@keyframes pulse {
  from { transform: scale(1); box-shadow: 0 4px 16px rgba(0,0,0,0.25); }
  to   { transform: scale(1.15); box-shadow: 0 6px 24px rgba(192,57,43,0.5); }
}
.service-panel {
  position: fixed;
  bottom: 148px;
  right: 20px;
  z-index: 901;
  width: 310px;
  max-height: 420px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #c0392b;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
}
.close-btn {
  background: none;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  border: none;
}
.panel-list { overflow-y: auto; flex: 1; }
.req-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid #f0ece4;
}
.req-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.req-table { font-weight: 700; font-size: 14px; color: #222; }
.req-zone { font-weight: 400; font-size: 12px; color: #888; }
.req-type { font-size: 12px; color: #c0392b; font-weight: 600; }
.req-note { font-size: 11px; color: #666; font-style: italic; }
.req-time { font-size: 11px; color: #aaa; }
.ack-btn {
  background: #27ae60;
  color: #fff;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 4px;
}
.slide-down-enter-active,
.slide-down-leave-active { transition: all 0.2s ease; }
.slide-down-enter-from,
.slide-down-leave-to { opacity: 0; transform: translateY(12px); }
</style>
