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

export default api;
