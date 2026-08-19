import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

/**
 * Room naming convention:
 *  - table:<tableId>                   -> customer listening to their own order/table status
 *  - restaurant:<restaurantId>:kitchen -> kitchen display listens here
 *  - restaurant:<restaurantId>:staff   -> staff app listens here (service requests, table status, payments)
 *
 * Staff/kitchen sockets authenticate via a JWT passed in the connection handshake
 * (`socket.handshake.auth.token`) and are auto-joined to their restaurant's rooms
 * server-side, immediately on connect. This removes the race condition that existed
 * before (client had to emit a "join" event after connecting, and if that arrived
 * even a moment late — or the socket silently reconnected, e.g. during dev HMR —
 * events emitted in between were missed and orders would appear "stuck" until a
 * manual page refresh).
 *
 * Plain "join"/"leave" is still available for the public customer app, but is
 * restricted to "table:*" rooms only — no auth needed to watch your own table.
 */
export function initSocket(httpServer, corsOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    },
  });

  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.join(`restaurant:${payload.restaurantId}:kitchen`);
        socket.join(`restaurant:${payload.restaurantId}:staff`);
      } catch (err) {
        // invalid/expired token - socket just won't receive staff/kitchen room events
      }
    }

    socket.on("join", (room) => {
      if (typeof room === "string" && room.startsWith("table:")) socket.join(room);
    });

    socket.on("leave", (room) => {
      if (typeof room === "string" && room.startsWith("table:")) socket.leave(room);
    });

    socket.on("disconnect", () => {
      // no-op, room membership is cleaned up automatically
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized yet");
  return io;
}

// ---- Emit helpers used by controllers ----

export function emitNewOrder(restaurantId, order) {
  getIO().to(`restaurant:${restaurantId}:kitchen`).emit("order:new", order);
  getIO().to(`restaurant:${restaurantId}:staff`).emit("order:new", order);
}

export function emitOrderUpdated(restaurantId, order) {
  getIO().to(`restaurant:${restaurantId}:kitchen`).emit("order:updated", order);
  getIO().to(`restaurant:${restaurantId}:staff`).emit("order:updated", order);
  getIO().to(`table:${order.tableId}`).emit("order:updated", order);
}

export function emitTableStatus(restaurantId, table) {
  getIO().to(`restaurant:${restaurantId}:staff`).emit("table:status", table);
  getIO().to(`table:${table._id}`).emit("table:status", table);
}

export function emitServiceRequest(restaurantId, request) {
  getIO().to(`restaurant:${restaurantId}:staff`).emit("service:requested", request);
}

export function emitServiceAcknowledged(restaurantId, request) {
  getIO().to(`restaurant:${restaurantId}:staff`).emit("service:acknowledged", request);
  getIO().to(`table:${request.tableId}`).emit("service:acknowledged", request);
}

export function emitPaymentUpdated(restaurantId, payment) {
  getIO().to(`restaurant:${restaurantId}:staff`).emit("payment:updated", payment);
  getIO().to(`table:${payment.tableId}`).emit("payment:updated", payment);
}
