import { defineStore } from "pinia";
import api from "../api/client";
import socket from "../api/socket";
import { useAuthStore } from "./auth";

const ACTIVE_STATUSES = ["pending", "accepted", "cooking"];

export const useKitchenStore = defineStore("kitchen", {
  state: () => ({
    orders: [],
    station: "all", // 'all' | 'kitchen' | 'drink' | 'dessert' | 'grill'
    loading: false,
    soundEnabled: true,
    socketBound: false,
  }),

  getters: {
    visibleOrders(state) {
      const active = state.orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
      if (state.station === "all") return active;
      return active
        .map((o) => ({ ...o, items: o.items.filter((i) => i.station === state.station) }))
        .filter((o) => o.items.length > 0);
    },
  },

  actions: {
    async loadOrders() {
      this.loading = true;
      try {
        const { data } = await api.get("/order/kitchen");
        this.orders = data;
      } finally {
        this.loading = false;
      }
    },

    connectSocket() {
      const auth = useAuthStore();
      if (!auth.staff || !auth.token) return;

      socket.auth = { token: auth.token };
      if (!socket.connected) socket.connect();

      if (this.socketBound) return;
      this.socketBound = true;

      // Self-heal: any (re)connect re-syncs the full order list from the server.
      // This covers the case where the socket silently dropped and reconnected
      // (e.g. dev server HMR, brief network blip) — without this, orders placed
      // during the gap would never appear until a manual page refresh.
      socket.on("connect", () => {
        this.loadOrders();
      });

      socket.on("order:new", (order) => {
        const exists = this.orders.some((o) => o._id === order._id);
        if (!exists) {
          this.orders.push(order);
          if (this.soundEnabled) this.playChime();
        }
      });

      socket.on("order:updated", (order) => {
        const idx = this.orders.findIndex((o) => o._id === order._id);
        if (idx !== -1) this.orders[idx] = { ...this.orders[idx], ...order };
        else this.orders.push(order);
      });
    },

    playChime() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.stop(ctx.currentTime + 0.4);
      } catch {
        // audio not available, ignore
      }
    },

    async updateItemStatus(orderId, itemId, itemStatus) {
      const { data } = await api.patch(`/order/${orderId}/item/${itemId}`, { itemStatus });
      const idx = this.orders.findIndex((o) => o._id === data._id);
      if (idx !== -1) this.orders[idx] = { ...this.orders[idx], ...data };
    },
  },
});
