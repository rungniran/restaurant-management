import { defineStore } from "pinia";
import api from "../api/client";
import socket from "../api/socket";

export const useTableStore = defineStore("table", {
  state: () => ({
    qrToken: null,
    table: null,
    restaurantId: null,
    orders: [],
    loading: false,
    error: null,
    payment: null,
  }),

  getters: {
    activeOrders(state) {
      return state.orders.filter((o) => o.status !== "cancelled");
    },
    orderTotal(state) {
      return state.orders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    },
  },

  actions: {
    async loadTable(qrToken) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.get(`/table/qr/${qrToken}`);
        this.qrToken = qrToken;
        this.table = data.table;
        this.restaurantId = data.table.restaurantId;
        this.orders = data.orders;
        this.connectSocket();
      } catch (err) {
        this.error = err.response?.data?.error || "ไม่สามารถโหลดข้อมูลโต๊ะได้";
      } finally {
        this.loading = false;
      }
    },

    connectSocket() {
      if (!socket.connected) socket.connect();
      socket.emit("join", `table:${this.table._id}`);

      socket.off("order:new");
      socket.off("order:updated");
      socket.off("table:status");
      socket.off("payment:updated");

      socket.on("order:new", (order) => {
        if (String(order.tableId) === String(this.table._id)) {
          this.orders.push(order);
        }
      });

      socket.on("order:updated", (order) => {
        const idx = this.orders.findIndex((o) => o._id === order._id);
        if (idx !== -1) this.orders[idx] = order;
      });

      socket.on("table:status", (table) => {
        if (table._id === this.table._id) this.table.status = table.status;
      });

      socket.on("payment:updated", (payment) => {
        this.payment = payment;
      });
    },

    async refreshOrders() {
      const { data } = await api.get(`/order/table/${this.qrToken}`);
      this.orders = data;
    },

    async callStaff(type = "call_staff", note = "") {
      await api.post("/service-request", { qrToken: this.qrToken, type, note });
    },

    async requestBill() {
      const { data } = await api.post("/payment/promptpay", { qrToken: this.qrToken });
      this.payment = data.payment;
      return data;
    },
  },
});
