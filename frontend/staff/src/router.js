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

const routes = [
  { path: "/", name: "landing", component: LandingView },
  { path: "/login", name: "login", component: LoginView },
  { path: "/signup", name: "signup", component: SignUpView },
  { path: "/setup", name: "setup", component: SetupWizardView },
  { path: "/dashboard", name: "dashboard", component: DashboardView },
  { path: "/tables", name: "tables", component: TablesView },
  { path: "/reservations", name: "reservations", component: ReservationsView },
  { path: "/payments", name: "payments", component: PaymentHistoryView },
  { path: "/menu", name: "menu", component: MenuManageView },
  { path: "/kitchen", name: "kitchen", component: BoardView },
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

  if (auth.isLoggedIn && publicRoutes.includes(to.name)) {
    return { name: isOwnerFlow ? "setup" : "tables" };
  }

  if (auth.isLoggedIn && to.name === "setup" && !isOwnerFlow) {
    return { name: "tables" };
  }
});

export default router;
