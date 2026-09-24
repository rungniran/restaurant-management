<template>
  <div class="auth-page">
    <div class="mode-card card">
      <button class="btn btn-ghost small" @click="router.push({ name: 'landing' })">← กลับ</button>
      <h1 class="display">เลือกรูปแบบการขาย</h1>
      <p class="sub">เลือกวิธีคิดค่าบริการหลักของร้าน คุณเปลี่ยนได้ภายหลัง</p>
      <div class="mode-options">
        <button class="mode-option" @click="selectMode('normal')">
          <strong>ขายตามสั่งปกติ</strong>
          <span>A La Carte · คิดราคาตามเมนูที่ลูกค้าสั่ง</span>
          <b>เลือกแบบนี้ →</b>
        </button>
        <button class="mode-option" @click="selectMode('buffet')">
          <strong>บุฟเฟต์</strong>
          <span>คิดราคาต่อคน พร้อมตั้งเวลาและราคาเด็กได้ภายหลัง</span>
          <b>เลือกแบบนี้ →</b>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

function selectMode(pricingMode) {
  router.push({ name: "signup", query: { pricingMode } });
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
.mode-card {
  width: min(620px, 100%);
  padding: 28px 26px;
}
h1 { margin: 22px 0 8px; }
.sub { color: var(--muted); margin-bottom: 22px; }
.mode-options { display: grid; gap: 14px; }
.mode-option {
  display: grid;
  gap: 8px;
  padding: 18px;
  text-align: left;
  color: var(--text);
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  cursor: pointer;
}
.mode-option:hover { border-color: var(--accent); }
.mode-option strong { font-size: 17px; }
.mode-option span { color: var(--muted); }
.mode-option b { color: var(--accent); }
</style>
