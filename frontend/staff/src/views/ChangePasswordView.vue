<template>
  <div class="login-wrap">
    <div class="login-card card">
      <div class="brand-row">
        <div class="brand-mark"><i class="fa-solid fa-key"></i></div>
        <div>
          <h1 class="display">ตั้งรหัสผ่านใหม่</h1>
          <p class="sub">เพื่อความปลอดภัย กรุณาเปลี่ยนรหัสผ่านชั่วคราวก่อนใช้งานต่อ</p>
        </div>
      </div>

      <form @submit.prevent="handleSubmit">
        <label>รหัสผ่านชั่วคราว (ปัจจุบัน)</label>
        <input v-model="currentPassword" type="password" placeholder="••••••••" autocomplete="current-password" />

        <label>รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label>
        <input v-model="newPassword" type="password" placeholder="••••••••" autocomplete="new-password" />

        <label>ยืนยันรหัสผ่านใหม่</label>
        <input v-model="confirmPassword" type="password" placeholder="••••••••" autocomplete="new-password" />

        <button type="submit" class="btn btn-accent login-btn" :disabled="loading">
          {{ loading ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน" }}
        </button>

        <p v-if="localError" class="error-text">{{ localError }}</p>
        <p v-else-if="auth.error" class="error-text">{{ auth.error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const localError = ref("");

async function handleSubmit() {
  localError.value = "";
  if (newPassword.value.length < 8) {
    localError.value = "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร";
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    localError.value = "รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน";
    return;
  }

  loading.value = true;
  const ok = await auth.changePassword(currentPassword.value, newPassword.value);
  loading.value = false;

  if (!ok) return;

  router.push({ name: ["owner", "manager"].includes(auth.staff?.role) ? "setup" : "tables" });
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #1d2026 0%, #14161a 70%);
}
.login-card {
  padding: 40px 36px;
  width: 100%;
  max-width: 420px;
  text-align: center;
}
.brand-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 18px;
}
.brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(224, 163, 61, 0.18), rgba(61, 139, 224, 0.15));
  border: 1px solid var(--line);
  font-size: 22px;
}
h1 {
  font-size: 20px;
  color: var(--accent);
}
.sub {
  color: var(--muted);
  font-size: 12.5px;
  margin: 4px 0 0;
}
form {
  text-align: left;
}
label {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin: 14px 0 6px;
}
input {
  width: 100%;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 11px 12px;
  color: var(--text);
  font-size: 14px;
}
.login-btn {
  width: 100%;
  padding: 12px;
  margin-top: 20px;
  font-size: 14px;
}
.error-text {
  color: var(--danger);
  font-size: 13px;
  margin-top: 12px;
  text-align: center;
}
</style>
