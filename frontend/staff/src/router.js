import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "./stores/auth";
import LandingView from "./views/LandingView.vue";
import LoginView from "./views/LoginView.vue";
import SignUpView from "./views/SignUpView.vue";
import SalesModeView from "./views/SalesModeView.vue";
import TablesView from "./views/TablesView.vue";
import ReservationsView from "./views/ReservationsView.vue";
import PaymentHistoryView from "./views/PaymentHistoryView.vue";
import MenuManageView from "./views/MenuManageView.vue";
import BoardView from "./views/BoardView.vue";
import DashboardView from "./views/DashboardView.vue";
import SetupWizardView from "./views/SetupWizardView.vue";
import ChangePasswordView from "./views/ChangePasswordView.vue";
import StaffManageView from "./views/StaffManageView.vue";
import InventoryView from "./views/InventoryView.vue";

const routes = [
  { path: "/", name: "landing", component: LandingView },
  { path: "/login", name: "login", component: LoginView },
  { path: "/signup", name: "signup", component: SignUpView },
  { path: "/sales-mode", name: "sales-mode", component: SalesModeView },
  { path: "/change-password", name: "change-password", component: ChangePasswordView },
  { path: "/setup", name: "setup", component: SetupWizardView, meta: { roles: ["owner", "manager"] } },
  { path: "/dashboard", name: "dashboard", component: DashboardView, meta: { roles: ["owner", "manager"] } },
  { path: "/tables", name: "tables", component: TablesView, meta: { roles: ["owner", "manager", "waiter", "cashier"] } },
  { path: "/reservations", name: "reservations", component: ReservationsView, meta: { roles: ["owner", "manager", "waiter"] } },
  { path: "/payments", name: "payments", component: PaymentHistoryView, meta: { roles: ["owner", "manager", "cashier"] } },
  { path: "/menu", name: "menu", component: MenuManageView, meta: { roles: ["owner", "manager"] } },
  { path: "/kitchen", name: "kitchen", component: BoardView, meta: { roles: ["owner", "manager", "kitchen"] } },
  { path: "/staff-accounts", name: "staffAccounts", component: StaffManageView, meta: { roles: ["owner", "manager"] } },
  { path: "/inventory", name: "inventory", component: InventoryView, meta: { roles: ["owner", "manager"] } },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  const publicRoutes = ["landing", "login", "signup", "sales-mode"];
  const isOwnerFlow = auth.staff && ["owner", "manager"].includes(auth.staff.role);

  // The marketing landing page should remain visible even after a staff login.
  if (to.name === "landing") {
    // Landing is a public entry point. Clear a stale session here so an old
    // token cannot trigger an API 401 redirect while the page is opening.
    if (auth.isLoggedIn) auth.logout();
    return;
  }

  // Signup must remain directly reachable on refresh, even when an old or
  // incomplete session is still present in localStorage.
  if (to.name === "signup") {
    if (!["normal", "buffet"].includes(to.query.pricingMode)) return { name: "sales-mode" };
    return;
  }

  if (!auth.isLoggedIn && !publicRoutes.includes(to.name)) {
    return { name: "landing" };
  }

  if (auth.isLoggedIn && auth.mustChangePassword && to.name !== "change-password") {
    return { name: "change-password" };
  }

  if (auth.isLoggedIn && !auth.mustChangePassword && to.name === "change-password") {
    return { name: isOwnerFlow ? "setup" : "tables" };
  }

  if (auth.isLoggedIn && publicRoutes.includes(to.name)) {
    return { name: isOwnerFlow ? "setup" : "tables" };
  }

  if (auth.isLoggedIn && to.name === "setup" && !isOwnerFlow) {
    return { name: "tables" };
  }

  if (auth.isLoggedIn && to.meta.roles && !to.meta.roles.includes(auth.staff?.role)) {
    return { name: auth.staff?.role === "kitchen" ? "kitchen" : "tables" };
  }
});

export default router;
