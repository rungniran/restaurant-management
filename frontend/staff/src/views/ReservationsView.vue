<template>
  <div class="page">
    <header class="page-header">
      <h2 class="display">การจองโต๊ะ</h2>
      <button class="btn btn-accent" @click="showModal = true">+ จองโต๊ะใหม่</button>
    </header>

    <div v-if="tables.upcomingReservations.length === 0" class="empty">ยังไม่มีรายการจอง</div>

    <div class="list">
      <div v-for="r in tables.upcomingReservations" :key="r._id" class="res-card card">
        <div class="res-top">
          <div>
            <div class="res-name">{{ r.customerName }}</div>
            <div class="res-meta">{{ formatDate(r.reservedFor) }} · {{ r.partySize }} ท่าน</div>
          </div>
          <span class="chip" :class="`chip-${r.status === 'booked' || r.status === 'confirmed' ? 'pending' : r.status}`">
            {{ statusLabel(r.status) }}
          </span>
        </div>

        <div class="res-tables">
          โต๊ะ: {{ r.tableIds.map((t) => t.tableNumber || t).join(", ") }}
        </div>
        <div v-if="r.phone" class="res-phone"><i class="fa-solid fa-phone"></i> {{ r.phone }}</div>
        <div v-if="r.note" class="res-note">{{ r.note }}</div>

        <div class="res-actions">
          <button v-if="r.status === 'booked'" class="btn small" @click="tables.updateReservationStatus(r._id, 'confirmed')">
            ยืนยันการจอง
          </button>
          <button v-if="['booked', 'confirmed'].includes(r.status)" class="btn small btn-accent" @click="tables.updateReservationStatus(r._id, 'seated')">
            ลูกค้ามาถึง (นั่งโต๊ะ)
          </button>
          <button v-if="!['cancelled', 'completed'].includes(r.status)" class="btn small btn-danger" @click="tables.cancelReservation(r._id)">
            ยกเลิก
          </button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="modal card">
        <h3>จองโต๊ะใหม่</h3>

        <label>ชื่อลูกค้า</label>
        <input v-model="form.customerName" placeholder="คุณสมชาย" />

        <label>เบอร์โทร</label>
        <input v-model="form.phone" placeholder="08x-xxx-xxxx" />

        <label>จำนวนคน</label>
        <input v-model.number="form.partySize" type="number" min="1" />

        <label>วันเวลา</label>
        <input v-model="form.reservedFor" type="datetime-local" />

        <label>เลือกโต๊ะ (กดเลือกได้หลายโต๊ะ)</label>
        <div class="table-picker">
          <button
            v-for="t in tables.tables"
            :key="t._id"
            type="button"
            class="pick-chip"
            :class="{ active: form.tableIds.includes(t._id) }"
            @click="togglePick(t._id)"
          >
            {{ t.tableNumber }}
          </button>
        </div>

        <label>หมายเหตุ</label>
        <input v-model="form.note" placeholder="เช่น ต้องการเก้าอี้เด็ก" />

        <div class="modal-actions">
          <button class="btn" @click="showModal = false">ยกเลิก</button>
          <button class="btn btn-accent" @click="submit">จองโต๊ะ</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from "vue";
import { useTablesStore } from "../stores/tables";

const tables = useTablesStore();
const showModal = ref(false);

const form = reactive({
  customerName: "",
  phone: "",
  partySize: 2,
  reservedFor: "",
  tableIds: [],
  note: "",
});

const STATUS_LABELS = {
  booked: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  seated: "นั่งโต๊ะแล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  no_show: "ไม่มา",
};
function statusLabel(s) {
  return STATUS_LABELS[s] || s;
}

function formatDate(d) {
  return new Date(d).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

onMounted(async () => {
  await tables.loadTables();
  await tables.loadReservations();
});

function togglePick(id) {
  if (form.tableIds.includes(id)) form.tableIds = form.tableIds.filter((x) => x !== id);
  else form.tableIds.push(id);
}

async function submit() {
  if (!form.customerName || !form.reservedFor || form.tableIds.length === 0) {
    alert("กรุณากรอกชื่อ, เวลา, และเลือกโต๊ะอย่างน้อย 1 โต๊ะ");
    return;
  }
  await tables.createReservation({ ...form, reservedFor: new Date(form.reservedFor).toISOString() });
  showModal.value = false;
  Object.assign(form, { customerName: "", phone: "", partySize: 2, reservedFor: "", tableIds: [], note: "" });
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
h2 {
  font-size: 22px;
  color: var(--accent);
}
.empty {
  color: var(--muted);
  padding: 40px 0;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.res-card {
  padding: 14px 16px;
}
.res-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.res-name {
  font-weight: 700;
  font-size: 15px;
}
.res-meta {
  font-size: 12.5px;
  color: var(--muted);
  margin-top: 2px;
}
.res-tables,
.res-phone,
.res-note {
  font-size: 12.5px;
  color: var(--text);
  margin-top: 8px;
}
.res-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.btn.small {
  padding: 6px 12px;
  font-size: 12px;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 20px;
}
.modal {
  padding: 24px;
  width: 100%;
  max-width: 380px;
  max-height: 85vh;
  overflow-y: auto;
}
.modal h3 {
  margin-bottom: 6px;
}
.modal label {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin: 12px 0 6px;
}
.modal input {
  width: 100%;
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 8px;
  padding: 9px 10px;
}
.table-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pick-chip {
  background: var(--panel-2);
  color: var(--muted);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
}
.pick-chip.active {
  background: var(--accent);
  color: #1d1200;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
</style>
