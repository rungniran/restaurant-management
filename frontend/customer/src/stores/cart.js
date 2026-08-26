import { defineStore } from "pinia";
import api from "../api/client";
import { useTableStore } from "./table";

let cartLineId = 0;

export const useCartStore = defineStore("cart", {
  state: () => ({
    categories: [], // [{ _id, name, items: [...] }]
    cart: [], // [{ lineId, menuItem, quantity, selectedOptions, note }]
    currentQrToken: null,
    loading: false,
    submitting: false,
    error: null,
  }),

  getters: {
    allItems(state) {
      return state.categories.flatMap((c) => c.items);
    },
    cartCount(state) {
      return state.cart.reduce((sum, l) => sum + l.quantity, 0);
    },
    cartTotal(state) {
      return state.cart.reduce((sum, l) => sum + lineTotal(l), 0);
    },
  },

  actions: {
    initCart(qrToken) {
      if (qrToken) this.currentQrToken = qrToken;
      const key = this.currentQrToken ? `cart_${this.currentQrToken}` : "cart_default";
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          this.cart = JSON.parse(saved);
          cartLineId = Math.max(0, ...this.cart.map((c) => c.lineId || 0));
        }
      } catch {
        // ignore parse error
      }
    },

    persist() {
      const key = this.currentQrToken ? `cart_${this.currentQrToken}` : "cart_default";
      try {
        if (this.cart.length > 0) {
          localStorage.setItem(key, JSON.stringify(this.cart));
        } else {
          localStorage.removeItem(key);
        }
      } catch {
        // ignore storage error
      }
    },

    async loadMenu(restaurantId, qrToken) {
      if (qrToken) this.initCart(qrToken);
      this.loading = true;
      try {
        const { data } = await api.get(`/menu/${restaurantId}`);
        this.categories = data.categories;
      } catch (err) {
        this.error = "โหลดเมนูไม่สำเร็จ";
      } finally {
        this.loading = false;
      }
    },

    addToCart({ menuItem, quantity, selectedOptions, note }) {
      this.cart.push({
        lineId: ++cartLineId,
        menuItem,
        quantity,
        selectedOptions,
        note,
      });
      this.persist();
    },

    updateCartLine(lineId, { menuItem, quantity, selectedOptions, note }) {
      const idx = this.cart.findIndex((l) => l.lineId === lineId);
      if (idx !== -1) {
        this.cart[idx] = {
          lineId,
          menuItem: menuItem || this.cart[idx].menuItem,
          quantity: Math.max(1, quantity),
          selectedOptions: selectedOptions || [],
          note: note || "",
        };
        this.persist();
      }
    },

    removeFromCart(lineId) {
      this.cart = this.cart.filter((l) => l.lineId !== lineId);
      this.persist();
    },

    updateQuantity(lineId, quantity) {
      const line = this.cart.find((l) => l.lineId === lineId);
      if (line) {
        line.quantity = Math.max(1, quantity);
        this.persist();
      }
    },

    clearCart() {
      this.cart = [];
      this.persist();
    },

    async submitOrder() {
      const tableStore = useTableStore();
      this.submitting = true;
      this.error = null;
      try {
        const items = this.cart.map((l) => ({
          menuItemId: l.menuItem._id,
          name: l.menuItem.name,
          quantity: l.quantity,
          note: l.note,
          selectedOptions: l.selectedOptions,
        }));
        const { data } = await api.post("/order", { qrToken: tableStore.qrToken, items });
        this.clearCart();
        await tableStore.refreshOrders();
        return data;
      } catch (err) {
        this.error = err.response?.data?.error || "สั่งอาหารไม่สำเร็จ";
        throw err;
      } finally {
        this.submitting = false;
      }
    },
  },
});

function lineTotal(line) {
  const extra = (line.selectedOptions || []).reduce((s, o) => s + (o.extraPrice || 0), 0);
  return (line.menuItem.price + extra) * line.quantity;
}

export { lineTotal };
