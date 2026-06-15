import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "./auth.store";

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
type SocketAuthPayload = {
  token?: string;
};

const readSocketAuth = (socket: Socket): SocketAuthPayload =>
  typeof socket.auth === "object" && socket.auth !== null
    ? (socket.auth as SocketAuthPayload)
    : {};

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  connect: () => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;

    const currentSocket = get().socket;

    // Reuse the same socket instance so pages don't pile up duplicate listeners.
    if (currentSocket) {
      const currentAuth = readSocketAuth(currentSocket);

      if (currentAuth.token !== accessToken) {
        currentSocket.auth = { ...currentAuth, token: accessToken };

        if (currentSocket.connected) {
          currentSocket.disconnect();
        }

        currentSocket.connect();
        return;
      }

      if (!currentSocket.connected) {
        currentSocket.connect();
      }

      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      autoConnect: false,
      transports: ["websocket"]
    });

    socket.on("connect", () => {
      console.log("Socket connected!");
      set({ isConnected: true });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected!");
      set({ isConnected: false });
    });

    socket.on("connect_error", (err) => {
      if (err.message.includes("Authentication error") || err.message.includes("Invalid token")) {
        socket.disconnect();
        set({ socket: null, isConnected: false });
        useAuthStore.getState().logout();
        return;
      }

      console.warn("Socket connect error:", err.message);
    });

    set({ socket });
    socket.connect();
  },
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  }
}));
