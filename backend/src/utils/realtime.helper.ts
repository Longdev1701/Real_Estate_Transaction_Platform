import type { Server as SocketIOServer } from "socket.io";

let ioInstance: SocketIOServer | null = null;

export const setRealtimeServer = (io: SocketIOServer) => {
  ioInstance = io;
};

export const emitToUser = (userId: string, event: string, payload: unknown) => {
  ioInstance?.to(userId).emit(event, payload);
};

export const emitToRoom = (roomId: string, event: string, payload: unknown) => {
  ioInstance?.to(roomId).emit(event, payload);
};
