import { io } from "socket.io-client";

// Falls back to same-origin so this works automatically once served by the backend.
const socket = io(import.meta.env.VITE_SOCKET_URL || "/", {
  autoConnect: false,
});

export default socket;
