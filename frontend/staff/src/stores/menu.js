import { defineStore } from "pinia";
import api from "../api/client";
import { useAuthStore } from "./auth";

export const useMenuStore = defineStore("menu", {
  state: () => ({
    categories: [], // [{ _id, name, items: [...] }]
    loading: false,
    error: null,
  }),

  getters: {
    allItems(state) {
      return state.categories.flatMap((c) => c.items);
    },
  },

  actions: {
    async loadMenu() {
      const auth = useAuthStore();
      if (!auth.staff) return;
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.get(`/menu/${auth.staff.restaurantId}`);
        this.categories = data.categories;
      } catch (err) {
        this.error = "โหลดเมนูไม่สำเร็จ";
      } finally {
        this.loading = false;
      }
    },

    async addCategory(name) {
      await api.post("/menu/category", { name, order: this.categories.length + 1 });
      await this.loadMenu();
    },

    async deleteCategory(id) {
      if (!confirm("ลบหมวดหมู่นี้จะลบเมนูอาหารในหมวดนี้ทั้งหมดด้วย ยืนยันหรือไม่?")) return;
      await api.delete(`/menu/category/${id}`);
      await this.loadMenu();
    },

    async addItem(payload) {
      await api.post("/menu/item", payload);
      await this.loadMenu();
    },

    async updateItem(id, payload) {
      await api.patch(`/menu/item/${id}`, payload);
      await this.loadMenu();
    },

    async deleteItem(id) {
      await api.delete(`/menu/item/${id}`);
      await this.loadMenu();
    },

    async toggleAvailability(id) {
      await api.patch(`/menu/item/${id}/toggle`);
      await this.loadMenu();
    },
  },
});
