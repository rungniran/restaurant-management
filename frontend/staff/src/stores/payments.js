import { defineStore } from "pinia";
import api from "../api/client";

export const usePaymentsStore = defineStore("payments", {
  state: () => ({
    payments: [],
    loading: false,
    filters: { status: "", method: "", from: "", to: "" },
  }),

  getters: {
    totalPaid(state) {
      return state.payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    },
  },

  actions: {
    async loadHistory() {
      this.loading = true;
      try {
        const params = {};
        for (const [k, v] of Object.entries(this.filters)) if (v) params[k] = v;
        const { data } = await api.get("/payment/history", { params });
        this.payments = data;
      } finally {
        this.loading = false;
      }
    },

    async confirmPayment(id) {
      const { data } = await api.post(`/payment/${id}/confirm`);
      const idx = this.payments.findIndex((p) => p._id === id);
      if (idx !== -1) this.payments[idx] = data;
    },
  },
});
