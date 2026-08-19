<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="topline">
        <button class="btn btn-ghost small" @click="router.push({ name: 'landing' })">← กลับ</button>
      </div>

      <h1 class="display">สมัครสมาชิก</h1>
      <p class="sub">สร้างร้านใหม่และเริ่มการตั้งค่าให้พร้อมเปิดให้ลูกค้าใช้บริการ</p>

      <form @submit.prevent="submit">
        <div class="form-grid">
          <div>
            <label>ชื่อร้าน</label>
            <input v-model="form.name" placeholder="เช่น ร้านอร่อยดี" required />
          </div>
          <div>
            <label>ชื่อสำหรับแสดง</label>
            <input v-model="form.displayName" placeholder="เช่น ร้านอร่อยดี Grill & Cafe" required />
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

        <button class="btn btn-accent full" type="submit" :disabled="loading">
          {{ loading ? "กำลังสร้างร้าน..." : "สร้างร้านและเข้าสู่ Setup Wizard" }}
        </button>

        <p v-if="error" class="error-text">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "../api/client";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);
const error = ref("");

const form = ref({
  name: "",
  displayName: "",
  phone: "",
  address: "",
  logoUrl: "",
});

async function submit() {
  if (!form.value.name || !form.value.displayName) {
    error.value = "กรุณากรอกชื่อร้านและชื่อสำหรับแสดง";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const { data } = await api.post("/restaurant", form.value);
    const ok = await auth.login(data.owner.username, data.owner.password, data.restaurant._id);
    if (!ok) {
      throw new Error(auth.error || "เข้าสู่ระบบไม่สำเร็จ");
    }
    router.push({ name: "setup" });
  } catch (err) {
    error.value = err.response?.data?.error || err.message || "สร้างร้านไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at top, #1d2026 0%, #14161a 70%);
  padding: 24px;
}

.auth-card {
  width: min(720px, 100%);
  padding: 28px 26px;
}

.topline {
  display: flex;
  justify-content: flex-start;
}

h1 {
  margin: 20px 0 8px;
}

.sub {
  color: var(--muted);
  margin-bottom: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
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
  padding: 11px 12px;
}

textarea {
  resize: vertical;
}

.full {
  width: 100%;
  margin-top: 22px;
}

.error-text {
  margin-top: 12px;
  color: var(--danger);
  text-align: center;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
