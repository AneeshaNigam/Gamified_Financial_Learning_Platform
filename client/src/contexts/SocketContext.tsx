/** @format */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "@/services/socket";
import { useAuth } from "@/contexts/AuthContext";

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  connecting: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Track user ID to avoid re-running effect on every user object change
  const userId = user?._id ?? null;

  useEffect(() => {
    if (!userId) {
      // User logged out — tear down socket
      if (socketRef.current) {
        disconnectSocket();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
        setConnecting(false);
      }
      return;
    }

    // Already have a working socket for this user — skip
    if (socketRef.current?.connected) {
      setSocket(socketRef.current);
      setConnected(true);
      return;
    }

    // Create the socket
    let s: Socket;
    try {
      setConnecting(true);
      s = getSocket();
    } catch (err) {
      console.error("Failed to create socket:", err);
      setConnecting(false);
      return;
    }

    socketRef.current = s;

    /* ── Event handlers ── */
    const onConnect = () => {
      console.log("[SocketProvider] Socket connected!", s.id);
      setConnected(true);
      setConnecting(false);

      // Start heartbeat
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => {
        if (s.connected) s.emit("heartbeat");
      }, 20000);
    };

    const onDisconnect = (reason: string) => {
      console.log("[SocketProvider] Socket disconnected:", reason);
      setConnected(false);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };

    const onConnectError = (err: Error) => {
      console.error("[SocketProvider] Socket connection error:", err.message);
      setConnecting(false);
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);

    // If already connected (fast path), fire immediately
    if (s.connected) {
      onConnect();
    }

    setSocket(s);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onConnectError);

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [userId]); // Only re-run when user ID changes (login/logout), NOT on every user object change

  // Cleanup on full unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
      socketRef.current = null;
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, connecting }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
