import { createRouter, createWebHistory } from "vue-router";
import MenuView from "./views/MenuView.vue";
import CartView from "./views/CartView.vue";
import OrderStatusView from "./views/OrderStatusView.vue";
import BillView from "./views/BillView.vue";
import ReceiptView from "./views/ReceiptView.vue";

const routes = [
  { path: "/order/:qrToken", name: "menu", component: MenuView, props: true },
  { path: "/order/:qrToken/cart", name: "cart", component: CartView, props: true },
  { path: "/order/:qrToken/status", name: "status", component: OrderStatusView, props: true },
  { path: "/order/:qrToken/bill", name: "bill", component: BillView, props: true },
  // Standalone — no table context needed. Used by the customer right after paying,
  // and by staff (Payment History) to view/reprint any receipt by its payment id.
  { path: "/receipt/:paymentId", name: "receipt", component: ReceiptView, props: true },
  { path: "/", redirect: "/order/demo" },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
