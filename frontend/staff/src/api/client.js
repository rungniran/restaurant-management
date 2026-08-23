import axios from "axios";

// Falls back to same-origin "/api" so this works automatically once the backend
// serves this app's build output. Set VITE_API_URL in .env for split dev servers.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("staff_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the token is rejected (expired, or the account was deactivated /
// re-checked server-side), clear the session and bounce to login instead of
// leaving the user stuck on a broken page with silent 401s.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("staff_token");
      localStorage.removeItem("staff_info");
      if (!window.location.pathname.endsWith("/staff/") && !window.location.pathname.endsWith("/staff")) {
        window.location.href = "/staff/";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
