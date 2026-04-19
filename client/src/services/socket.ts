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
 * Always returns the SAME socket instance (singleton).
 * The socket handles its own reconnection via socket.io's built-in reconnect.
 */
export function getSocket(): Socket {
  // If we already have a socket instance (connected or reconnecting), reuse it
  if (socket) return socket;

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

/**
 * Force a fresh socket connection (e.g., after token refresh).
 * Disconnects the old socket and creates a new one.
 */
export function reconnectSocket(): Socket {
  disconnectSocket();
  return getSocket();
}
