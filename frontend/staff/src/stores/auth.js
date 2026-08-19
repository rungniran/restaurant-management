import { defineStore } from "pinia";
import api from "../api/client";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("staff_token") || null,
    staff: JSON.parse(localStorage.getItem("staff_info") || "null"),
    error: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
  },

  actions: {
    async login(username, password, restaurantId = null) {
      this.error = null;
      try {
        const { data } = await api.post("/staff/login", { username, password, restaurantId });
        this.token = data.token;
        this.staff = data.staff;
        localStorage.setItem("staff_token", data.token);
        localStorage.setItem("staff_info", JSON.stringify(data.staff));
        return true;
      } catch (err) {
        this.error = err.response?.data?.error || "เข้าสู่ระบบไม่สำเร็จ";
        return false;
      }
    },

    async loginGoogleWithCredential(credential) {
      this.error = null;
      try {
        const { data } = await api.post("/staff/login-google", { credential });
        this.token = data.token;
        this.staff = data.staff;
        localStorage.setItem("staff_token", data.token);
        localStorage.setItem("staff_info", JSON.stringify(data.staff));
        return true;
      } catch (err) {
        this.error = err.response?.data?.error || "Google login ไม่สำเร็จ";
        return false;
      }
    },

    logout() {
      this.token = null;
      this.staff = null;
      localStorage.removeItem("staff_token");
      localStorage.removeItem("staff_info");
    },
  },
});
