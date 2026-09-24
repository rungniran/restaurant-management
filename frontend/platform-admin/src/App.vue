<template>
  <main class="platform-page">
    <section v-if="!token" class="admin-login">
      <div class="admin-mark">R</div>
      <p class="eyebrow">PLATFORM CONTROL</p>
      <h1>Back office</h1>
      <p class="intro">เข้าสู่ระบบเพื่อดูร้านที่สมัครใช้งาน</p>
      <form @submit.prevent="login">
        <label for="username">ชื่อผู้ดูแล</label>
        <input id="username" v-model="credentials.username" autocomplete="username" required />
        <label for="password">รหัสผ่าน</label>
        <input id="password" v-model="credentials.password" type="password" autocomplete="current-password" required />
        <p v-if="error" class="error-text">{{ error }}</p>
        <button :disabled="loading">{{ loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ back office" }}</button>
      </form>
    </section>

    <template v-else>
      <header class="admin-header">
        <div>
          <p class="eyebrow">PLATFORM CONTROL</p>
          <h1>ร้านที่สมัครใช้งาน</h1>
          <p class="intro">ข้อมูลบัญชีร้านและวันที่สมัครล่าสุด</p>
        </div>
        <button class="secondary" @click="logout">ออกจากระบบ</button>
      </header>
      <p v-if="error" class="error-text">{{ error }}</p>
      <div class="admin-stats">
        <article class="stat"><span>ร้านทั้งหมด</span><strong>{{ data.total ?? "—" }}</strong></article>
        <article class="stat"><span>สมัครวันนี้</span><strong>{{ data.today ?? "—" }}</strong></article>
        <article class="stat"><span>แสดงล่าสุด</span><strong>{{ data.shown ?? "—" }}</strong></article>
      </div>
      <section class="signup-list">
        <div class="list-heading"><h2>รายชื่อร้าน</h2><button class="secondary" @click="loadSignups">รีเฟรช</button></div>
        <div v-if="loading" class="empty">กำลังโหลดข้อมูล...</div>
        <div v-else-if="!data.signups?.length" class="empty">ยังไม่มีผู้สมัคร</div>
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>ร้าน / ผู้สมัคร</th><th>Username</th><th>โทรศัพท์</th><th>รูปแบบ</th><th>สถานะ</th><th>วันที่สมัคร</th></tr></thead>
            <tbody>
              <tr v-for="signup in data.signups" :key="signup.id">
                <td><strong>{{ signup.displayName || signup.name }}</strong><small>{{ signup.name }}</small></td>
                <td>{{ signup.owner?.username ? `@${signup.owner.username}` : "—" }}<small>{{ signup.owner?.name || "" }}</small></td>
                <td>{{ signup.phone || "—" }}</td>
                <td>{{ signup.pricingMode === "buffet" ? "บุฟเฟต์" : "ตามเมนู" }}</td>
                <td><span class="status">{{ statusLabel(signup.subscriptionStatus) }}</span></td>
                <td>{{ dateLabel(signup.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import axios from "axios";

const apiOrigin = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
const api = axios.create({ baseURL: `${apiOrigin}/api` });
const token = ref(sessionStorage.getItem("platform_admin_token") || "");
const credentials = reactive({ username: "", password: "" });
const data = reactive({ total: null, today: null, shown: null, signups: [] });
const loading = ref(false);
const error = ref("");

async function login() {
  loading.value = true; error.value = "";
  try {
    const response = await api.post("/platform/login", credentials);
    token.value = response.data.token;
    sessionStorage.setItem("platform_admin_token", token.value);
    credentials.password = "";
    await loadSignups();
  } catch (err) {
    error.value = err.response?.data?.error || "เข้าสู่ระบบไม่สำเร็จ";
  } finally { loading.value = false; }
}

async function loadSignups() {
  loading.value = true; error.value = "";
  try {
    const response = await api.get("/platform/signups", { headers: { Authorization: `Bearer ${token.value}` } });
    Object.assign(data, response.data);
  } catch (err) {
    if (err.response?.status === 401) logout();
    error.value = err.response?.data?.error || "โหลดข้อมูลไม่สำเร็จ";
  } finally { loading.value = false; }
}

function logout() {
  token.value = ""; sessionStorage.removeItem("platform_admin_token");
  Object.assign(data, { total: null, today: null, shown: null, signups: [] });
}
function dateLabel(value) { return value ? new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "—"; }
function statusLabel(value) { return ({ trial: "ทดลองใช้", active: "ใช้งาน", past_due: "ค้างชำระ", cancelled: "ยกเลิก" })[value] || "ทดลองใช้"; }

onMounted(() => { if (token.value) loadSignups(); });
</script>
