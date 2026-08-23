<template>
  <Transition name="install-fade">
    <div v-if="show" class="install-overlay" @click.self="dismiss">
      <div class="install-card">
        <div class="install-row">
          <div class="install-icon"><img :src="iconSrc" alt="" /></div>
          <div class="install-info">
            <div class="install-name">สั่งอาหาร</div>
            <div class="install-domain">{{ hostname }}</div>
          </div>
        </div>
        <div class="install-actions">
          <button class="install-btn install-confirm" @click="install">ติดตั้ง</button>
          <button class="install-btn install-cancel" @click="dismiss">ยกเลิก</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted } from "vue";

const show = ref(false);
const hostname = window.location.hostname;
const iconSrc = "/icon-192.png";
let deferredPrompt = null;

const STORAGE_KEY = "installPromptDismissedAt";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // don't nag again for 7 days after dismiss

function recentlyDismissed() {
  const t = Number(localStorage.getItem(STORAGE_KEY) || 0);
  return Date.now() - t < SNOOZE_MS;
}

onMounted(() => {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!recentlyDismissed()) show.value = true;
  });
  window.addEventListener("appinstalled", () => {
    show.value = false;
    deferredPrompt = null;
  });
});

async function install() {
  if (!deferredPrompt) {
    show.value = false;
    return;
  }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  show.value = false;
}

function dismiss() {
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
  show.value = false;
}
</script>

<style scoped>
.install-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 999;
  padding: 0 14px calc(14px + env(safe-area-inset-bottom));
}
.install-card {
  width: 100%;
  max-width: 420px;
  background: #1c1c1c;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}
.install-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.install-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: #111;
}
.install-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.install-name {
  color: #fff;
  font-weight: 600;
  font-size: 14.5px;
}
.install-domain {
  color: #9a9a9a;
  font-size: 12.5px;
  margin-top: 1px;
}
.install-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.install-btn {
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 600;
  font-family: inherit;
  border: none;
}
.install-cancel {
  background: transparent;
  color: #d6d6d6;
  border: 1.5px solid #454545;
}
.install-cancel:hover {
  border-color: #6a6a6a;
}
.install-confirm {
  background: #fff;
  color: #111;
}
.install-confirm:hover {
  background: #ececec;
}
.install-fade-enter-active,
.install-fade-leave-active {
  transition: opacity 0.2s ease;
}
.install-fade-enter-from,
.install-fade-leave-to {
  opacity: 0;
}
</style>
