import type { SystemRole } from '../constants/permissions.js';
import type { AuthJwtPayload } from '../utils/jwtHelpers.js';
import type { AuthenticatedSocket } from './socket.types.js';

export const PRESENCE_EVENTS = {
  UPDATE: 'presence:update',
} as const;

export type PresenceStatus = 'online' | 'offline';

export type PresenceSession = {
  socketId: string;
  userId: string;
  roleName: string;
  connectedAt: Date;
};

export type PresenceUpdatePayload = {
  userId: string;
  roleName: string;
  status: PresenceStatus;
  socketCount: number;
  lastSeenAt?: Date;
};

const socketSessions = new Map<string, PresenceSession>();
const userSockets = new Map<string, Set<string>>();
const roleUsers = new Map<string, Set<string>>();

let broadcastPresenceUpdate: ((payload: PresenceUpdatePayload) => void) | null = null;

const getUserSocketCount = (userId: string): number => {
  return userSockets.get(userId)?.size ?? 0;
};

const addRoleUser = (roleName: string, userId: string): void => {
  const users = roleUsers.get(roleName) ?? new Set<string>();
  users.add(userId);
  roleUsers.set(roleName, users);
};

const removeRoleUser = (roleName: string, userId: string): void => {
  const users = roleUsers.get(roleName);
  if (!users) {
    return;
  }

  users.delete(userId);

  if (users.size === 0) {
    roleUsers.delete(roleName);
  }
};

const emitPresenceUpdate = (payload: PresenceUpdatePayload): void => {
  if (!broadcastPresenceUpdate) {
    return;
  }

  broadcastPresenceUpdate(payload);
};

const registerSocketSession = (socket: AuthenticatedSocket): void => {
  const { userId, roleName } = socket.data.user;
  const existingSession = socketSessions.get(socket.id);

  if (existingSession) {
    return;
  }

  const wasOffline = !isUserOnline(userId);
  const sockets = userSockets.get(userId) ?? new Set<string>();

  socketSessions.set(socket.id, {
    socketId: socket.id,
    userId,
    roleName,
    connectedAt: new Date(),
  });

  sockets.add(socket.id);
  userSockets.set(userId, sockets);
  addRoleUser(roleName, userId);

  if (wasOffline) {
    emitPresenceUpdate({
      userId,
      roleName,
      status: 'online',
      socketCount: getUserSocketCount(userId),
    });
  }
};

const unregisterSocketSession = (socketId: string): void => {
  const session = socketSessions.get(socketId);
  if (!session) {
    return;
  }

  socketSessions.delete(socketId);

  const sockets = userSockets.get(session.userId);
  sockets?.delete(socketId);

  if (sockets && sockets.size > 0) {
    userSockets.set(session.userId, sockets);
    return;
  }

  userSockets.delete(session.userId);
  removeRoleUser(session.roleName, session.userId);

  emitPresenceUpdate({
    userId: session.userId,
    roleName: session.roleName,
    status: 'offline',
    socketCount: 0,
    lastSeenAt: new Date(),
  });
};

const isUserOnline = (userId: string): boolean => {
  return getUserSocketCount(userId) > 0;
};

const getActiveSessions = (userId?: string): PresenceSession[] => {
  if (!userId) {
    return [...socketSessions.values()];
  }

  const sockets = userSockets.get(userId);
  if (!sockets) {
    return [];
  }

  return [...sockets]
    .map((socketId) => socketSessions.get(socketId))
    .filter((session): session is PresenceSession => Boolean(session));
};

const getOnlineUserIdsByRole = (roleName: SystemRole): string[] => {
  return [...(roleUsers.get(roleName) ?? new Set<string>())];
};

const getPresenceSnapshot = (user: AuthJwtPayload): PresenceUpdatePayload => ({
  userId: user.userId,
  roleName: user.roleName,
  status: isUserOnline(user.userId) ? 'online' : 'offline',
  socketCount: getUserSocketCount(user.userId),
});

const setPresenceBroadcaster = (broadcaster: (payload: PresenceUpdatePayload) => void): void => {
  broadcastPresenceUpdate = broadcaster;
};

export const PresenceManager = {
  registerSocketSession,
  unregisterSocketSession,
  isUserOnline,
  getActiveSessions,
  getOnlineUserIdsByRole,
  getPresenceSnapshot,
  setPresenceBroadcaster,
};

export {
  registerSocketSession,
  unregisterSocketSession,
  isUserOnline,
  getActiveSessions,
  getOnlineUserIdsByRole,
  getPresenceSnapshot,
  setPresenceBroadcaster,
};
