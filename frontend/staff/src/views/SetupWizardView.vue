<template>
  <div class="page setup-page">
    <div class="setup-header">
      <div>
        <p class="eyebrow">Owner Onboarding</p>
        <h2 class="display">Setup Wizard</h2>
      </div>
      <div class="header-actions">
        <button
          class="btn"
          :class="restaurant?.isOpen ? 'btn-ghost' : 'btn-accent'"
          @click="toggleRestaurantStatus"
        >
          {{ restaurant?.isOpen ? "ปิดร้าน" : "เปิดร้าน" }}
        </button>
        <button class="btn btn-accent" @click="router.push({ name: 'dashboard' })">ไป Dashboard</button>
      </div>
    </div>

    <div v-if="loading" class="empty">กำลังโหลดข้อมูลร้าน...</div>
    <div v-else class="wizard-wrap">
      <div class="wizard-card card">
        <div class="wizard-top">
          <div>
            <h3>{{ restaurant?.displayName || restaurant?.name || "ร้าน บุพเฟ่" }}</h3>
            <p class="muted">ภาพรวมการตั้งค่าให้พร้อมเปิดร้าน</p>
          </div>
          <div class="progress-box">
            <strong>{{ progress }}%</strong>
            <small>เสร็จแล้ว</small>
          </div>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>

        <div class="steps">
          <div
            v-for="step in steps"
            :key="step.key"
            class="step-item"
            :class="{ done: step.done, active: !step.done }"
            @click="navigate(step)"
          >
            <div class="check-badge">{{ step.done ? '✓' : step.key.charAt(0).toUpperCase() }}</div>
            <div class="step-copy">
              <strong>{{ step.label }}</strong>
              <small>{{ step.done ? 'เสร็จแล้ว' : 'ยังไม่เสร็จ' }}</small>
            </div>
          </div>
        </div>

        <div class="quick-actions">
          <h4>จัดการเร่งด่วน</h4>
          <div class="quick-grid">
            <button class="mini-action" @click="router.push('/tables')">จัดการโต๊ะ</button>
            <button class="mini-action" @click="router.push('/dashboard')">ดู Dashboard</button>
            <button class="mini-action muted-action" @click="router.push('/menu')">เพิ่มเมนู</button>
          </div>
        </div>
      </div>

      <div class="wizard-card card">
        <h3>ตั้งค่าร้านของคุณ</h3>
        <div class="form-grid">
          <div>
            <label>ชื่อร้าน</label>
            <input v-model="form.name" placeholder="เช่น บุพเฟ่ Bistro" />
          </div>
          <div>
            <label>ชื่อสำหรับแสดง</label>
            <input v-model="form.displayName" placeholder="เช่น Burapa Dining House" />
          </div>
          <div>
            <label>เบอร์โทร</label>
            <input v-model="form.phone" placeholder="0812345678" />
          </div>
          <div>
            <label>โลโก้ URL</label>
            <input v-model="form.logoUrl" placeholder="https://..." />
          </div>
          <div class="full-width">
            <label>ที่อยู่</label>
            <textarea v-model="form.address" rows="3" placeholder="ที่อยู่ร้าน"></textarea>
          </div>
        </div>

        <div class="wizard-actions">
          <button class="btn" @click="fetchSetupStatus">รีเฟรช</button>
          <button class="btn btn-accent" @click="saveRestaurant">บันทึกข้อมูลร้าน</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../api/client";

const router = useRouter();
const loading = ref(false);
const restaurant = ref(null);
const progress = ref(0);
const steps = ref([]);

const form = ref({
  name: "",
  displayName: "",
  phone: "",
  address: "",
  logoUrl: "",
});

const setupHrefMap = {
  restaurant: "/setup",
  tables: "/tables",
  qr: "/tables",
  staff: "/dashboard",
  category: "/menu",
  menu: "/menu",
};

async function fetchSetupStatus() {
  loading.value = true;
  try {
    const { data } = await api.get("/restaurant/setup-status");
    restaurant.value = data.restaurant;
    steps.value = data.steps || [];
    progress.value = data.progress || 0;
    if (restaurant.value) {
      form.value = {
        name: restaurant.value.name || "",
        displayName: restaurant.value.displayName || restaurant.value.name || "",
        phone: restaurant.value.phone || "",
        address: restaurant.value.address || "",
        logoUrl: restaurant.value.logoUrl || "",
      };
    }
  } catch (err) {
    console.error("Setup status load failed", err);
  } finally {
    loading.value = false;
  }
}

async function saveRestaurant() {
  try {
    await api.patch("/restaurant/me", form.value);
    await fetchSetupStatus();
    alert("บันทึกข้อมูลร้านเรียบร้อยแล้ว");
  } catch (err) {
    alert(err.response?.data?.error || "บันทึกข้อมูลร้านไม่สำเร็จ");
  }
}

async function toggleRestaurantStatus() {
  if (!restaurant.value) return;

  try {
    const { data } = await api.patch("/restaurant/me", { isOpen: !restaurant.value.isOpen });
    restaurant.value = data;
    alert(data.isOpen ? "ร้านเปิดให้บริการแล้ว" : "ร้านปิดให้บริการชั่วคราว");
  } catch (err) {
    alert(err.response?.data?.error || "เปลี่ยนสถานะร้านไม่สำเร็จ");
  }
}

function navigate(step) {
  if (step.done || step.key === "restaurant") return;
  const target = setupHrefMap[step.key] || "/tables";
  router.push(target);
}

onMounted(() => {
  fetchSetupStatus();
});
</script>

<style scoped>
.page {
  padding: 24px;
}

.setup-page {
  min-height: 100vh;
}

.setup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.wizard-wrap {
  display: grid;
  grid-template-columns: 1.1fr 1.4fr;
  gap: 20px;
}

.wizard-card {
  padding: 20px;
}

.wizard-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.wizard-top h3 {
  margin: 0;
  font-size: 24px;
}

.muted {
  color: var(--muted);
  margin: 6px 0 0;
  font-size: 12px;
}

.progress-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 12px;
}

.progress-box strong {
  color: var(--accent);
  font-size: 20px;
}

.progress-box small {
  color: var(--muted);
}

.progress-bar {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: var(--panel-2);
  overflow: hidden;
  margin: 18px 0 22px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #10b981);
  border-radius: inherit;
}

.steps {
  display: grid;
  gap: 12px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.step-item.done {
  border-color: #34d399;
  background: rgba(16, 185, 129, 0.08);
}

.step-item.active {
  border-color: var(--accent);
}

.check-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--panel);
  color: var(--text);
  font-weight: 700;
}

.step-item.done .check-badge {
  background: #10b981;
  color: white;
}

.step-copy {
  display: flex;
  flex-direction: column;
}

.step-copy small {
  color: var(--muted);
}

.quick-actions {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.quick-actions h4 {
  margin: 0 0 12px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.mini-action {
  padding: 12px 10px;
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--line);
  color: var(--text);
  font-weight: 600;
}

.muted-action {
  opacity: 0.82;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.full-width {
  grid-column: 1 / -1;
}

label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--muted);
}

input,
textarea {
  width: 100%;
  background: var(--panel-2);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  resize: vertical;
}

textarea {
  min-height: 84px;
}

.wizard-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.empty {
  color: var(--muted);
  padding: 40px 0;
  text-align: center;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
@media (max-width: 900px) {
  .wizard-wrap {
    grid-template-columns: 1fr;
  }

  .quick-grid {
    grid-template-columns: 1fr;
  }
}
</style>
