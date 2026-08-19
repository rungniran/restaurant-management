import axios from "axios";

// Falls back to same-origin "/api" so this works automatically once the backend
// serves this app's build output (see backend/README section "Build & serve from
// backend"). Set VITE_API_URL in .env to point elsewhere (e.g. during split dev
// servers where this app runs on its own Vite port).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

export default api;
