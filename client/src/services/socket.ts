/** @format */

import { io, Socket } from "socket.io-client";
import { getToken } from "./api";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace("/api", "") ||
  "http://localhost:5000";

let socket: Socket | null = null;

/**
 * Get or create the socket connection.
 * Authenticates using the JWT token from localStorage.
 */
export function getSocket(): Socket {
  if (socket?.connected) return socket;

  const token = getToken();
  if (!token) {
    throw new Error("No auth token available for socket connection");
  }

  socket = io(SOCKET_URL, {
    auth: { token: `Bearer ${token}` },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
  });

  return socket;
}

/**
 * Disconnect the socket and clean up.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Check if socket is currently connected.
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
