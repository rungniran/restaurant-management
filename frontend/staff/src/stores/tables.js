import { defineStore } from "pinia";
import api from "../api/client";
import socket from "../api/socket";
import { useAuthStore } from "./auth";

export const useTablesStore = defineStore("tables", {
  state: () => ({
    tables: [],
    reservations: [],
    pendingServiceRequests: [],
    loading: false,
    error: null,
    selectedForMerge: [], // table ids currently checked for merge action
    socketBound: false,
  }),

  getters: {
    tablesByZone(state) {
      const zones = {};
      for (const t of state.tables) {
        zones[t.zone || "อื่นๆ"] = zones[t.zone || "อื่นๆ"] || [];
        zones[t.zone || "อื่นๆ"].push(t);
      }
      return zones;
    },
    upcomingReservations(state) {
      return [...state.reservations]
        .filter((r) => !["cancelled", "completed", "no_show"].includes(r.status))
        .sort((a, b) => new Date(a.reservedFor) - new Date(b.reservedFor));
    },
  },

  actions: {
    async loadTables() {
      this.loading = true;
      try {
        const { data } = await api.get("/table");
        this.tables = data;
      } finally {
        this.loading = false;
      }
    },

    async loadReservations() {
      const { data } = await api.get("/reservation");
      this.reservations = data;
    },

    connectSocket() {
      const auth = useAuthStore();
      if (!auth.staff || !auth.token) return;

      socket.auth = { token: auth.token };
      if (!socket.connected) socket.connect();

      if (this.socketBound) return;
      this.socketBound = true;

      // Self-heal on (re)connect so a dropped socket never leaves the board stale.
      socket.on("connect", () => {
        this.loadTables();
      });

      socket.on("table:status", (table) => {
        const idx = this.tables.findIndex((t) => t._id === table._id);
        if (idx !== -1) this.tables[idx] = { ...this.tables[idx], ...table };
      });

      socket.on("service:requested", (request) => {
        this.pendingServiceRequests.unshift(request);
      });
    },

    async createTable(tableNumber, zone) {
      const { data } = await api.post("/table", { tableNumber, zone });
      this.tables.push(data);
      return data;
    },

    async releaseTable(id, force = false) {
      try {
        const { data } = await api.patch(`/table/${id}/release`, { force });
        const idx = this.tables.findIndex((t) => t._id === id);
        if (idx !== -1) this.tables[idx] = data;
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.response?.data?.error || "ปล่อยโต๊ะไม่สำเร็จ" };
      }
    },

    async updateStatus(id, status) {
      const { data } = await api.patch(`/table/${id}/status`, { status });
      const idx = this.tables.findIndex((t) => t._id === id);
      if (idx !== -1) this.tables[idx] = data;
    },

    toggleMergeSelect(id) {
      if (this.selectedForMerge.includes(id)) {
        this.selectedForMerge = this.selectedForMerge.filter((x) => x !== id);
      } else {
        this.selectedForMerge.push(id);
      }
    },

    async confirmMerge() {
      if (this.selectedForMerge.length < 2) return { ok: false, error: "เลือกอย่างน้อย 2 โต๊ะ" };
      const { data } = await api.post("/table/merge", { tableIds: this.selectedForMerge });
      await this.loadTables();
      this.selectedForMerge = [];
      return { ok: true, data };
    },

    async unmergeTable(id) {
      await api.patch(`/table/${id}/unmerge`);
      await this.loadTables();
    },

    async createReservation(payload) {
      const { data } = await api.post("/reservation", payload);
      this.reservations.unshift(data);
      return data;
    },

    async updateReservationStatus(id, status) {
      const { data } = await api.patch(`/reservation/${id}`, { status });
      const idx = this.reservations.findIndex((r) => r._id === id);
      if (idx !== -1) this.reservations[idx] = data;
      if (status === "seated") await this.loadTables();
    },

    async cancelReservation(id) {
      const { data } = await api.delete(`/reservation/${id}`);
      const idx = this.reservations.findIndex((r) => r._id === id);
      if (idx !== -1) this.reservations[idx] = data;
    },
  },
});
