import { defineStore } from "pinia";
import api from "../api/client";

export const useStaffStore = defineStore("staffAccounts", {
  state: () => ({
    list: [],
    loading: false,
    error: null,
  }),

  actions: {
    async loadStaff() {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.get("/staff");
        this.list = data;
      } catch (err) {
        this.error = err.response?.data?.error || "โหลดรายชื่อพนักงานไม่สำเร็จ";
      } finally {
        this.loading = false;
      }
    },

    async createStaff(payload) {
      this.error = null;
      try {
        await api.post("/staff", payload);
        await this.loadStaff();
        return true;
      } catch (err) {
        this.error = err.response?.data?.error || "เพิ่มพนักงานไม่สำเร็จ";
        return false;
      }
    },

    async updateStaff(id, payload) {
      this.error = null;
      try {
        await api.patch(`/staff/${id}`, payload);
        await this.loadStaff();
        return true;
      } catch (err) {
        this.error = err.response?.data?.error || "แก้ไขพนักงานไม่สำเร็จ";
        return false;
      }
    },

    async deleteStaff(id) {
      this.error = null;
      try {
        await api.delete(`/staff/${id}`);
        await this.loadStaff();
        return true;
      } catch (err) {
        this.error = err.response?.data?.error || "ลบพนักงานไม่สำเร็จ";
        return false;
      }
    },
  },
});
