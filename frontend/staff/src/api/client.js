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
let redirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isLoginRequest = requestUrl.endsWith("/staff/login") || requestUrl.endsWith("/staff/login-google");
    const isPublicAuthPage = /\/staff\/(signup|login)\/?$/.test(window.location.pathname);

    if (error.response?.status === 401 && !isLoginRequest && !isPublicAuthPage && !redirecting) {
      redirecting = true;
      localStorage.removeItem("staff_token");
      localStorage.removeItem("staff_info");
      window.location.href = "/staff/login";
    }
    return Promise.reject(error);
  }
);

export default api;
