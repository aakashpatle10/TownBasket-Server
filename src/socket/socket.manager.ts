import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { SYSTEM_ROLES } from '../constants/permissions.js';
import { corsOptions } from '../config/corsOperation.js';
import { socketAuthMiddleware } from './socket.auth.js';
import { registerChatSocketHandlers } from './socket.chat.js';
import {
  PRESENCE_EVENTS,
  getActiveSessions,
  getOnlineUserIdsByRole,
  getPresenceSnapshot,
  isUserOnline,
  registerSocketSession,
  setPresenceBroadcaster,
  unregisterSocketSession,
} from './presence.manager.js';
import { SOCKET_ROOMS } from './socket.rooms.js';
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './socket.types.js';

type SocketServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

let ioInstance: SocketServer | null = null;

const ensureSocketServer = (): SocketServer => {
  if (!ioInstance) {
    throw new Error('Socket.IO server has not been initialized');
  }

  return ioInstance;
};

const bindSocketListener = <EventName extends keyof ClientToServerEvents>(
  socket: AuthenticatedSocket,
  eventName: EventName,
  handler: ClientToServerEvents[EventName]
): void => {
  socket.removeAllListeners(eventName);
  socket.on(eventName, handler as never);
};

const joinDefaultRooms = async (socket: AuthenticatedSocket): Promise<void> => {
  const { userId, roleName } = socket.data.user;

  await socket.join(SOCKET_ROOMS.user(userId));

  if (roleName === SYSTEM_ROLES.ADMIN) {
    await socket.join(SOCKET_ROOMS.admin());
  }

  if (roleName === SYSTEM_ROLES.SELLER) {
    await socket.join(SOCKET_ROOMS.seller(userId));
  }

  if (roleName === SYSTEM_ROLES.DELIVERY) {
    await socket.join(SOCKET_ROOMS.delivery(userId));
  }
};

const handleConnection = async (socket: AuthenticatedSocket): Promise<void> => {
  await joinDefaultRooms(socket);
  registerSocketSession(socket);

  socket.emit('connected', {
    socketId: socket.id,
    userId: socket.data.user.userId,
  });

  socket.emit(PRESENCE_EVENTS.UPDATE, getPresenceSnapshot(socket.data.user));

  bindSocketListener(socket, 'reconnect', () => {
    void joinDefaultRooms(socket).then(() => {
      registerSocketSession(socket);
      socket.emit('reconnected', {
        socketId: socket.id,
        userId: socket.data.user.userId,
      });
      socket.emit(PRESENCE_EVENTS.UPDATE, getPresenceSnapshot(socket.data.user));
    });
  });

  registerChatSocketHandlers(socket);

  socket.once('disconnect', (reason) => {
    unregisterSocketSession(socket.id);
    console.log(`Socket disconnected: ${socket.id}. Reason: ${reason}`);
  });
};

export const initializeSocketServer = (httpServer: HttpServer): SocketServer => {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: corsOptions,
  });

  setPresenceBroadcaster((payload) => {
    ioInstance?.emit(PRESENCE_EVENTS.UPDATE, payload);
  });

  ioInstance.use((socket, next) => {
    void socketAuthMiddleware(socket, next);
  });

  ioInstance.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    void handleConnection(socket);
  });

  return ioInstance;
};

export const getSocketServer = (): SocketServer => {
  return ensureSocketServer();
};

export const joinOrderRoom = async (socket: AuthenticatedSocket, orderId: string): Promise<void> => {
  await socket.join(SOCKET_ROOMS.order(orderId));
};

export const leaveOrderRoom = async (socket: AuthenticatedSocket, orderId: string): Promise<void> => {
  await socket.leave(SOCKET_ROOMS.order(orderId));
};

export const emitToUser = (userId: string, event: string, payload: unknown): void => {
  ensureSocketServer().to(SOCKET_ROOMS.user(userId)).emit(event, payload);
};

export const emitToAdmin = (event: string, payload: unknown): void => {
  ensureSocketServer().to(SOCKET_ROOMS.admin()).emit(event, payload);
};

export const emitToSeller = (sellerId: string, event: string, payload: unknown): void => {
  ensureSocketServer().to(SOCKET_ROOMS.seller(sellerId)).emit(event, payload);
};

export const emitToDelivery = (deliveryId: string, event: string, payload: unknown): void => {
  ensureSocketServer().to(SOCKET_ROOMS.delivery(deliveryId)).emit(event, payload);
};

export const emitToOrder = (orderId: string, event: string, payload: unknown): void => {
  ensureSocketServer().to(SOCKET_ROOMS.order(orderId)).emit(event, payload);
};

export const emitToAll = (event: string, payload: unknown): void => {
  ensureSocketServer().emit(event, payload);
};

export const SocketManager = {
  initializeSocketServer,
  getSocketServer,
  joinOrderRoom,
  leaveOrderRoom,
  emitToUser,
  emitToAdmin,
  emitToSeller,
  emitToDelivery,
  emitToOrder,
  emitToAll,
  isUserOnline,
  getActiveSessions,
  getOnlineUserIdsByRole,
};
