import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "./stores/auth";
import LandingView from "./views/LandingView.vue";
import LoginView from "./views/LoginView.vue";
import SignUpView from "./views/SignUpView.vue";
import TablesView from "./views/TablesView.vue";
import ReservationsView from "./views/ReservationsView.vue";
import PaymentHistoryView from "./views/PaymentHistoryView.vue";
import MenuManageView from "./views/MenuManageView.vue";
import BoardView from "./views/BoardView.vue";
import DashboardView from "./views/DashboardView.vue";
import SetupWizardView from "./views/SetupWizardView.vue";
import ChangePasswordView from "./views/ChangePasswordView.vue";
import StaffManageView from "./views/StaffManageView.vue";

const routes = [
  { path: "/", name: "landing", component: LandingView },
  { path: "/login", name: "login", component: LoginView },
  { path: "/signup", name: "signup", component: SignUpView },
  { path: "/change-password", name: "change-password", component: ChangePasswordView },
  { path: "/setup", name: "setup", component: SetupWizardView, meta: { roles: ["owner", "manager"] } },
  { path: "/dashboard", name: "dashboard", component: DashboardView, meta: { roles: ["owner", "manager"] } },
  { path: "/tables", name: "tables", component: TablesView, meta: { roles: ["owner", "manager", "waiter", "cashier"] } },
  { path: "/reservations", name: "reservations", component: ReservationsView, meta: { roles: ["owner", "manager", "waiter"] } },
  { path: "/payments", name: "payments", component: PaymentHistoryView, meta: { roles: ["owner", "manager", "cashier"] } },
  { path: "/menu", name: "menu", component: MenuManageView, meta: { roles: ["owner", "manager"] } },
  { path: "/kitchen", name: "kitchen", component: BoardView, meta: { roles: ["owner", "manager", "kitchen"] } },
  { path: "/staff-accounts", name: "staffAccounts", component: StaffManageView, meta: { roles: ["owner", "manager"] } },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  const publicRoutes = ["landing", "login", "signup"];
  const isOwnerFlow = auth.staff && ["owner", "manager"].includes(auth.staff.role);

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
