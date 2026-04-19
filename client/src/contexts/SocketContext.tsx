/** @format */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { Socket } from "socket.io-client";
import { getSocket, disconnectSocket, isSocketConnected } from "@/services/socket";
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

  const connect = useCallback(() => {
    if (!user) return;

    try {
      setConnecting(true);
      const s = getSocket();

      s.on("connect", () => {
        setConnected(true);
        setConnecting(false);

        // Start heartbeat (every 20s)
        heartbeatRef.current = setInterval(() => {
          if (s.connected) s.emit("heartbeat");
        }, 20000);
      });

      s.on("disconnect", () => {
        setConnected(false);
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      });

      s.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
        setConnecting(false);
      });

      setSocket(s);
    } catch (err) {
      console.error("Failed to create socket:", err);
      setConnecting(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !isSocketConnected()) {
      connect();
    }

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [user, connect]);

  // Cleanup on logout
  useEffect(() => {
    if (!user && socket) {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
    }
  }, [user, socket]);

  return (
    <SocketContext.Provider value={{ socket, connected, connecting }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
