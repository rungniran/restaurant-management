<template>
  <div class="login-wrap">
    <div class="login-card card">
      <div class="brand-row">
        <div class="brand-mark"><i class="fa-solid fa-bowl-food"></i></div>
        <div>
          <h1 class="display">Staff Portal</h1>
          <p class="sub">จัดการร้านอาหารแบบเรียลไทม์</p>
        </div>
      </div>

      <form @submit.prevent="handleLogin">
        <label>Username</label>
        <input v-model="username" type="text" placeholder="owner" autocomplete="username" />

        <label>Password</label>
        <input v-model="password" type="password" placeholder="••••••••" autocomplete="current-password" />

        <button type="submit" class="btn btn-accent login-btn" :disabled="loading">
          {{ loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ" }}
        </button>

        <div class="divider"><span>หรือ</span></div>

        <button type="button" id="google-signin-button" class="btn google-btn" @click="handleGoogleLogin" :disabled="loading">
          <span class="google-icon">G</span>
          Continue with Google
        </button>

        <p v-if="auth.error" class="error-text">{{ auth.error }}</p>
      </form>

      <p class="demo-hint">Demo: owner / owner123, waiter / waiter123, cashier / cashier123</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../api/client";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const username = ref("");
const password = ref("");
const loading = ref(false);

onMounted(() => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.warn("VITE_GOOGLE_CLIENT_ID is not configured. Google login is disabled.");
    return;
  }

  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;
  script.onload = () => {
    if (!window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        if (!response?.credential) return;
        loading.value = true;
        const ok = await auth.loginGoogleWithCredential(response.credential);
        loading.value = false;

        if (!ok) return;
        router.push({ name: ["owner", "manager"].includes(auth.staff?.role) ? "setup" : "tables" });
      },
    });

    const googleButton = document.getElementById("google-signin-button");
    if (googleButton) {
      window.google.accounts.id.renderButton(googleButton, {
        theme: "outline",
        size: "large",
        width: "100%",
        text: "continue_with",
      });
    }
  };

  document.head.appendChild(script);
});

async function handleLogin() {
  loading.value = true;
  const ok = await auth.login(username.value, password.value);
  loading.value = false;

  if (!ok) return;

  if (["owner", "manager"].includes(auth.staff?.role)) {
    try {
      const { data } = await api.get("/restaurant/setup-status");
      router.push({ name: data.progress >= 100 ? "dashboard" : "setup" });
    } catch (err) {
      router.push({ name: "setup" });
    }
    return;
  }

  router.push({ name: auth.staff?.role === "kitchen" ? "kitchen" : "tables" });
}

async function handleGoogleLogin() {
  if (!window.google?.accounts?.id) {
    alert("Google sign-in ยังไม่ได้ตั้งค่า กรุณาเพิ่ม VITE_GOOGLE_CLIENT_ID ใน .env");
    return;
  }

  window.google.accounts.id.prompt();
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
  font-size: 24px;
}
h1 {
  font-size: 24px;
  color: var(--accent);
}
.sub {
  color: var(--muted);
  font-size: 13px;
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
.login-btn,
.google-btn {
  width: 100%;
  padding: 12px;
  margin-top: 20px;
  font-size: 14px;
}
.google-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--line);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.google-icon {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fbbc05, #ea4335, #34a853, #4285f4);
  color: white;
  font-weight: 800;
  font-size: 12px;
}
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0 4px;
  color: var(--muted);
  font-size: 12px;
}
.divider::before,
.divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line);
}
.error-text {
  color: var(--danger);
  font-size: 13px;
  margin-top: 12px;
  text-align: center;
}
.demo-hint {
  color: var(--muted);
  font-size: 11px;
  margin-top: 20px;
}
</style>
