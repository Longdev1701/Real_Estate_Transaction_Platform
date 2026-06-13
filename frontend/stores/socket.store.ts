import { create } from "zustand";
import { io, Socket } from "socket.io-client";

import { refreshAccessToken } from "@/lib/api";
import { useAuthStore } from "./auth.store";

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

const isSocketAuthError = (message?: string) =>
  typeof message === "string" &&
  (message.includes("Authentication error") || message.includes("Invalid token"));

let socketRecoveryPromise: Promise<void> | null = null;

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  connect: async () => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;

    const currentSocket = get().socket;
    if (currentSocket) {
      if (currentSocket.auth && (currentSocket.auth as { token?: string }).token !== accessToken) {
        (currentSocket.auth as { token?: string }).token = accessToken;
        currentSocket.connect();
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      set({ isConnected: true });
    });

    socket.on("disconnect", () => {
      set({ isConnected: false });
    });

    socket.on("connect_error", async (err) => {
      set({ isConnected: false });

      if (!isSocketAuthError(err.message)) {
        return;
      }

      if (!socketRecoveryPromise) {
        socketRecoveryPromise = refreshAccessToken()
          .then((nextAccessToken) => {
            if (socket.auth) {
              (socket.auth as { token?: string }).token = nextAccessToken;
            }
            socket.connect();
          })
          .catch(() => {
            get().disconnect();
          })
          .finally(() => {
            socketRecoveryPromise = null;
          });
      }

      await socketRecoveryPromise;
    });

    set({ socket });
  },
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));
