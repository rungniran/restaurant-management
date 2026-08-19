<template>
  <div class="page">
    <header class="page-header">
      <h2 class="display">จัดการโต๊ะ</h2>
      <div class="actions">
        <button v-if="tables.selectedForMerge.length >= 2" class="btn btn-accent" @click="doMerge">
          <i class="fa-solid fa-link"></i> ต่อโต๊ะ ({{ tables.selectedForMerge.length }} โต๊ะ)
        </button>
        <button v-if="tables.selectedForMerge.length > 0" class="btn" @click="tables.selectedForMerge = []">
          ยกเลิกเลือก
        </button>
        <button class="btn btn-accent" @click="showAddModal = true">+ เพิ่มโต๊ะ</button>
      </div>
    </header>

    <p class="hint">ติ๊กเลือกหลายโต๊ะ แล้วกด "ต่อโต๊ะ" เพื่อรวมบิลของกลุ่ม (สำหรับลูกค้ากลุ่มใหญ่นั่งหลายโต๊ะ)</p>

    <div v-if="tables.loading" class="empty">กำลังโหลด...</div>

    <div v-else v-for="(list, zone) in tables.tablesByZone" :key="zone" class="zone-block">
      <h3 class="zone-title">โซน {{ zone }}</h3>
      <div class="grid">
        <div
          v-for="t in list"
          :key="t._id"
          class="table-card card"
          :class="{ selected: tables.selectedForMerge.includes(t._id), grouped: t.groupId }"
        >
          <div class="table-top">
            <label class="check">
              <input type="checkbox" :checked="tables.selectedForMerge.includes(t._id)" @change="tables.toggleMergeSelect(t._id)" />
            </label>
            <span class="t-num">{{ t.tableNumber }}</span>
            <span class="chip" :class="`chip-${t.status}`">{{ statusLabel(t.status) }}</span>
          </div>

          <div v-if="t.groupId" class="group-badge">
            <i class="fa-solid fa-link"></i> ต่อโต๊ะ {{ t.isGroupPrimary ? "(หลัก)" : "" }}
          </div>

          <div class="table-actions">
            <select :value="t.status" @change="tables.updateStatus(t._id, $event.target.value)">
              <option value="available">ว่าง</option>
              <option value="occupied">มีลูกค้า</option>
              <option value="ordering">กำลังสั่ง</option>
              <option value="waiting_bill">รอเช็คบิล</option>
              <option value="paid">จ่ายแล้ว</option>
              <option value="cleaning">กำลังทำความสะอาด</option>
            </select>

            <button class="btn small btn-info" @click="showQRCode(t)"><i class="fa-solid fa-qrcode"></i> QR Code</button>
            <button v-if="t.groupId" class="btn small" @click="tables.unmergeTable(t._id)">แยกโต๊ะ</button>
            <button
              class="btn small btn-danger"
              :disabled="t.status === 'available'"
              :title="t.status === 'available' ? 'โต๊ะนี้ว่างอยู่แล้ว' : ''"
              @click="release(t)"
            >
              ปล่อยโต๊ะ
            </button>
          </div>

          <div class="qr-token mono">token: {{ t.qrToken }}</div>
        </div>
      </div>
    </div>

    <!-- Add table modal -->
    <div v-if="showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
      <div class="modal card">
        <h3>เพิ่มโต๊ะใหม่</h3>
        <label>หมายเลขโต๊ะ</label>
        <input v-model="newTableNumber" placeholder="เช่น B01" />
        <label>โซน</label>
        <input v-model="newZone" placeholder="เช่น B" />
        <div class="modal-actions">
          <button class="btn" @click="showAddModal = false">ยกเลิก</button>
          <button class="btn btn-accent" @click="addTable">เพิ่มโต๊ะ</button>
        </div>
      </div>
    </div>

    <!-- QR Code modal -->
    <div v-if="showQRModal" class="modal-backdrop" @click.self="showQRModal = false">
      <div class="modal card qr-modal">
        <div class="qr-modal-header">
          <h3>QR Code - โต๊ะ {{ selectedTable?.tableNumber }}</h3>
          <button class="close-btn" @click="showQRModal = false">✕</button>
        </div>
        
        <div class="qr-container">
          <canvas :ref="qrCanvasRef" class="qr-canvas"></canvas>
        </div>

        <p class="qr-hint">สแกนด้วยมือถือเพื่อให้ลูกค้าสั่งอาหาร</p>
        <p class="qr-url">{{ getTableOrderUrl }}</p>

        <div class="modal-actions">
          <button class="btn" @click="copyToClipboard"><i class="fa-solid fa-clipboard"></i> Copy URL</button>
          <button class="btn btn-accent" @click="printQR"><i class="fa-solid fa-print"></i> พิมพ์</button>
          <button class="btn" @click="showQRModal = false">ปิด</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useTablesStore } from "../stores/tables";
import QRCode from "qrcode";

const tables = useTablesStore();
const showAddModal = ref(false);
const newTableNumber = ref("");
const newZone = ref("A");

const showQRModal = ref(false);
const selectedTable = ref(null);
const qrCanvas = ref(null);

const STATUS_LABELS = {
  available: "ว่าง",
  occupied: "มีลูกค้า",
  ordering: "กำลังสั่ง",
  waiting_bill: "รอเช็คบิล",
  paid: "จ่ายแล้ว",
  cleaning: "ทำความสะอาด",
};

const getTableOrderUrl = computed(() => {
  if (!selectedTable.value) return "";
  return `${window.location.origin}/order/${selectedTable.value.qrToken}`;
});

function qrCanvasRef(el) {
  qrCanvas.value = el;
}

function statusLabel(s) {
  return STATUS_LABELS[s] || s;
}

onMounted(async () => {
  await tables.loadTables();
  tables.connectSocket();
});

async function addTable() {
  if (!newTableNumber.value.trim()) return;
  await tables.createTable(newTableNumber.value.trim(), newZone.value.trim() || "A");
  newTableNumber.value = "";
  showAddModal.value = false;
}

async function doMerge() {
  const res = await tables.confirmMerge();
  if (!res.ok) alert(res.error);
}

async function release(t) {
  const res = await tables.releaseTable(t._id, false);
  if (!res.ok) {
    if (confirm(`${res.error}\n\nต้องการปล่อยโต๊ะแบบบังคับ (force) หรือไม่?`)) {
      await tables.releaseTable(t._id, true);
    }
  }
}

async function showQRCode(table) {
  selectedTable.value = table;
  showQRModal.value = true;
  
  // Generate QR code after modal is visible
  setTimeout(async () => {
    if (qrCanvas.value) {
      await QRCode.toCanvas(qrCanvas.value, getTableOrderUrl.value, {
        width: 300,
        margin: 2,
        color: { dark: "#000", light: "#FFF" }
      });
    }
  }, 100);
}

function copyToClipboard() {
  const url = getTableOrderUrl.value;
  navigator.clipboard.writeText(url).then(() => {
    alert("URL คัดลอกลงคลิปบอร์ดแล้ว");
  });
}

function printQR() {
  const printWindow = window.open("", "", "width=600,height=600");
  const url = getTableOrderUrl.value;
  printWindow.document.write(`
    <html>
    <head>
      <title>QR Code - โต๊ะ ${selectedTable.value?.tableNumber}</title>
      <style>
        body { display: flex; flex-direction: column; align-items: center; padding: 20px; font-family: Arial; }
        h1 { margin-bottom: 20px; }
        canvas { border: 1px solid #ccc; padding: 10px; }
        p { margin-top: 20px; font-size: 14px; }
      </style>
    </head>
    <body>
      <h1>QR Code - โต๊ะ ${selectedTable.value?.tableNumber}</h1>
      <p>URL: ${url}</p>
      <div id="qr"></div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode.js/1.5.4/qrcode.min.js"><\/script>
      <script>
        new QRCode(document.getElementById("qr"), {
          text: "${url}",
          width: 300,
          height: 300
        });
        setTimeout(() => window.print(), 500);
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
h2 {
  font-size: 22px;
  color: var(--accent);
}
.actions {
  display: flex;
  gap: 8px;
}
.hint {
  color: var(--muted);
  font-size: 12.5px;
  margin: 8px 0 20px;
}
.empty {
  color: var(--muted);
  padding: 40px 0;
}
.zone-block {
  margin-bottom: 26px;
}
.zone-title {
  font-size: 15px;
  color: var(--muted);
  margin-bottom: 10px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
}
.table-card {
  padding: 14px;
}
.table-card.selected {
  border-color: var(--accent);
}
.table-card.grouped {
  border-left: 3px solid var(--info);
}
.table-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.check {
  display: flex;
}
.t-num {
  font-weight: 700;
  font-size: 15px;
  flex: 1;
}
.group-badge {
  font-size: 11px;
  color: var(--info);
  margin-bottom: 8px;
}
.table-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
.table-actions select {
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12.5px;
}
.btn.small {
  padding: 6px 10px;
  font-size: 12px;
}
.qr-token {
  font-size: 10px;
  color: var(--muted);
  margin-top: 10px;
  word-break: break-all;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal {
  padding: 24px;
  width: 100%;
  max-width: 340px;
}
.modal h3 {
  margin-bottom: 14px;
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
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.qr-modal {
  max-width: 380px;
}

.qr-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.qr-modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--muted);
  padding: 0;
  width: 24px;
  height: 24px;
}

.qr-container {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: white;
  border-radius: 10px;
  margin: 16px 0;
}

.qr-canvas {
  border: 2px solid var(--line);
  border-radius: 8px;
}

.qr-hint {
  font-size: 12.5px;
  color: var(--muted);
  text-align: center;
  margin: 0;
}

.qr-url {
  font-size: 11px;
  color: #6b7268;
  word-break: break-all;
  background: var(--panel-2);
  padding: 10px;
  border-radius: 6px;
  margin: 12px 0;
  font-family: monospace;
}

.btn.btn-info {
  background: var(--info);
  color: white;
}

.btn.btn-info:hover {
  opacity: 0.9;
}
</style>
