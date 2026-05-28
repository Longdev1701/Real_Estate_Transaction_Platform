import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/auth.store";
import { useEffect, useRef, useState } from "react";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export const useSocket = () => {
  const { accessToken } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    if (!socketRef.current) {
      const socketInstance = io(SOCKET_URL, {
        auth: {
          token: accessToken
        },
        transports: ['websocket'],
      });

      socketInstance.on("connect", () => {
        setIsConnected(true);
      });

      socketInstance.on("disconnect", () => {
        setIsConnected(false);
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });

      socketRef.current = socketInstance;
      setSocket(socketInstance);
    }

    return () => {
      // Don't disconnect on unmount, we want the socket to persist across pages
      // unless we explicitly log out.
    };
  }, [accessToken]);

  return { socket, isConnected };
};
