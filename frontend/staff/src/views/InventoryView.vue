<template>
  <div class="page inventory-page">
    <header class="page-header">
      <div>
        <h2 class="display">สต็อกและต้นทุนอาหาร</h2>
        <p class="subtitle">ติดตามวัตถุดิบและจุดสั่งซื้อของร้าน</p>
      </div>
      <button class="btn btn-accent" @click="showAdd = true">+ เพิ่มวัตถุดิบ</button>
    </header>

    <p v-if="error" class="error-text">{{ error }}</p>
    <div class="summary-bar">
      <div class="summary-item"><span>วัตถุดิบทั้งหมด</span><strong>{{ items.length }}</strong></div>
      <div class="summary-item warning"><span>ใกล้หมด</span><strong>{{ lowStock.length }}</strong></div>
      <div class="summary-item"><span>มูลค่าสต็อก</span><strong>฿{{ stockValue.toLocaleString() }}</strong></div>
    </div>

    <div v-if="loading" class="empty">กำลังโหลดสต็อก...</div>
    <div v-else class="inventory-list">
      <div v-for="item in items" :key="item._id" class="inventory-row card" :class="{ low: item.stock <= item.reorderPoint }">
        <div class="item-main">
          <strong>{{ item.name }}</strong>
          <small>ต้นทุน ฿{{ item.costPerUnit }} / {{ item.unit }} · จุดสั่งซื้อ {{ item.reorderPoint }}</small>
        </div>
        <div class="stock-value"><strong>{{ item.stock }}</strong><span>{{ item.unit }}</span></div>
        <div class="row-actions">
          <button class="btn small" @click="adjust(item, -1)">− 1</button>
          <button class="btn small btn-accent" @click="adjust(item, 1)">+ 1</button>
        </div>
      </div>
      <div v-if="!items.length" class="empty">ยังไม่มีวัตถุดิบ</div>
    </div>

    <div v-if="showAdd" class="modal-backdrop" @click.self="showAdd = false">
      <form class="modal card" @submit.prevent="createItem">
        <h3>เพิ่มวัตถุดิบ</h3>
        <label>ชื่อวัตถุดิบ<input v-model.trim="form.name" required placeholder="เช่น หมูสไลซ์" /></label>
        <label>หน่วย<select v-model="form.unit"><option value="kg">กิโลกรัม</option><option value="piece">ชิ้น</option><option value="pack">แพ็ก</option><option value="l">ลิตร</option></select></label>
        <label>จำนวนเริ่มต้น<input v-model.number="form.stock" type="number" min="0" step="0.001" /></label>
        <label>ต้นทุนต่อหน่วย<input v-model.number="form.costPerUnit" type="number" min="0" step="0.01" /></label>
        <label>จุดสั่งซื้อ<input v-model.number="form.reorderPoint" type="number" min="0" step="0.001" /></label>
        <div class="modal-actions"><button type="button" class="btn" @click="showAdd = false">ยกเลิก</button><button class="btn btn-accent" :disabled="saving">บันทึก</button></div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import api from "../api/client";

const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const showAdd = ref(false);
const form = reactive({ name: "", unit: "kg", stock: 0, costPerUnit: 0, reorderPoint: 0 });
const lowStock = computed(() => items.value.filter((item) => item.stock <= item.reorderPoint));
const stockValue = computed(() => items.value.reduce((sum, item) => sum + item.stock * item.costPerUnit, 0));

async function load() {
  loading.value = true;
  error.value = "";
  try { const { data } = await api.get("/inventory/summary"); items.value = data.items; }
  catch (err) { error.value = err.response?.data?.error || "โหลดสต็อกไม่สำเร็จ"; }
  finally { loading.value = false; }
}
async function adjust(item, delta) {
  try { const { data } = await api.post(`/inventory/${item._id}/adjust`, { delta }); Object.assign(item, data); }
  catch (err) { error.value = err.response?.data?.error || "ปรับสต็อกไม่สำเร็จ"; }
}
async function createItem() {
  saving.value = true;
  try { const { data } = await api.post("/inventory", form); items.value.push(data); showAdd.value = false; Object.assign(form, { name: "", unit: "kg", stock: 0, costPerUnit: 0, reorderPoint: 0 }); }
  catch (err) { error.value = err.response?.data?.error || "เพิ่มวัตถุดิบไม่สำเร็จ"; }
  finally { saving.value = false; }
}
onMounted(load);
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px; }
.subtitle { color: var(--muted); margin: 5px 0 0; font-size: 13px; }
.summary-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
.summary-item { min-width: 150px; display: flex; flex-direction: column; gap: 5px; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 12px 16px; }
.summary-item span { color: var(--muted); font-size: 12px; }.summary-item strong { color: var(--accent); font-size: 20px; }.summary-item.warning strong { color: var(--danger); }
.inventory-list { display: flex; flex-direction: column; gap: 10px; }.inventory-row { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 18px; padding: 14px 16px; }.inventory-row.low { border-color: var(--danger); }.item-main { display: flex; flex-direction: column; gap: 4px; }.item-main small { color: var(--muted); font-size: 11px; }.stock-value { display: flex; align-items: baseline; gap: 5px; min-width: 90px; }.stock-value strong { font-size: 20px; }.stock-value span { color: var(--muted); font-size: 12px; }.row-actions { display: flex; gap: 6px; }.error-text { color: var(--danger); margin-bottom: 12px; }
@media (max-width: 650px) { .inventory-row { grid-template-columns: 1fr auto; }.row-actions { grid-column: 1 / -1; }.row-actions .btn { flex: 1; } }
</style>
