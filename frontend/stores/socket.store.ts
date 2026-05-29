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

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  connect: () => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;

    const currentSocket = get().socket;
    
    // If socket exists, update the token
    if (currentSocket) {
      if (currentSocket.auth && (currentSocket.auth as any).token !== accessToken) {
        (currentSocket.auth as any).token = accessToken;
        currentSocket.disconnect().connect();
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
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
      console.error("Socket connect error:", err);
      if (err.message.includes("Authentication error") || err.message.includes("Invalid token")) {
        // We do not disconnect completely, but wait for token to be refreshed
        // The token will be updated by the AuthSessionProvider when API refreshes it
      }
    });

    set({ socket });
  },
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  }
}));
