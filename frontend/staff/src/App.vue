<template>
  <div v-if="isLoginPage">
    <router-view />
  </div>
  <div v-else class="shell">
    <aside class="sidebar">
      <div class="brand display">
        <i class="fa-solid fa-bowl-food"></i>
        <span>Staff</span>
      </div>
      <nav>
        <router-link
          v-for="item in visibleNav"
          :key="item.name"
          :to="item.to"
          class="nav-item"
          active-class="active"
        >
          <i :class="['fa-solid', item.icon]"></i>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <div class="who">{{ auth.staff?.name }} · {{ roleLabel }}</div>
        <button class="logout-btn" @click="logout">ออกจากระบบ</button>
      </div>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "./stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const isLoginPage = computed(() => ["landing", "login", "signup"].includes(route.name));

const ALL_NAV = [
  { name: "setup", to: "/setup", icon: "fa-rocket", label: "Setup Wizard", roles: ["owner", "manager"] },
  { name: "dashboard", to: "/dashboard", icon: "fa-chart-column", label: "Dashboard", roles: ["owner", "manager"] },
  { name: "kitchen", to: "/kitchen", icon: "fa-burger", label: "จอครัว", roles: ["owner", "manager", "kitchen"] },
  { name: "tables", to: "/tables", icon: "fa-chair", label: "จัดการโต๊ะ", roles: ["owner", "manager", "waiter", "cashier"] },
  { name: "reservations", to: "/reservations", icon: "fa-calendar-days", label: "การจอง", roles: ["owner", "manager", "waiter"] },
  { name: "menu", to: "/menu", icon: "fa-book-open", label: "เมนูอาหาร", roles: ["owner", "manager"] },
  { name: "payments", to: "/payments", icon: "fa-receipt", label: "ประวัติการชำระเงิน", roles: ["owner", "manager", "cashier"] },
];

const visibleNav = computed(() => ALL_NAV.filter((item) => item.roles.includes(auth.staff?.role)));

const ROLE_LABELS = { owner: "เจ้าของร้าน", manager: "ผู้จัดการ", cashier: "แคชเชียร์", waiter: "พนักงานเสิร์ฟ", kitchen: "ครัว" };
const roleLabel = computed(() => ROLE_LABELS[auth.staff?.role] || auth.staff?.role);

function logout() {
  auth.logout();
  router.push({ name: "login" });
}
</script>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
  background: #0e1117;
}
.sidebar {
  position: sticky;
  top: 0;
  width: 230px;
  height: 100vh;
  background: rgba(22, 27, 34, 0.96);
  backdrop-filter: blur(12px);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  flex-shrink: 0;
  z-index: 10;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  color: var(--accent);
  margin-bottom: 24px;
  padding: 0 8px;
}
.brand i {
  font-size: 16px;
}
nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  text-decoration: none;
  padding: 11px 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  transition: 0.2s ease;
}
.nav-item i {
  width: 16px;
  text-align: center;
}
.nav-item:hover {
  background: rgba(255,255,255,0.03);
  color: var(--text);
}
.nav-item.active {
  background: linear-gradient(90deg, rgba(224,163,61,0.14), rgba(61,139,224,0.08));
  color: var(--text);
  border: 1px solid rgba(224,163,61,0.25);
}
.sidebar-footer {
  border-top: 1px solid var(--line);
  padding-top: 14px;
}
.who {
  font-size: 12px;
  color: var(--muted);
  padding: 0 8px 10px;
}
.logout-btn {
  width: 100%;
  background: var(--panel-2);
  color: var(--text);
  padding: 9px;
  font-size: 13px;
  border: 1px solid var(--line);
}
.content {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
}
</style>
