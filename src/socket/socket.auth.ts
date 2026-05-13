import config from '../config/environment.js';
import { User } from '../modules/user/user.model.js';
import { jwtHelpers } from '../utils/jwtHelpers.js';
import type { AuthenticatedSocket } from './socket.types.js';

const extractBearerToken = (authorization?: string): string | null => {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() === 'bearer' && token) {
    return token;
  }

  return authorization.trim() || null;
};

const getSocketToken = (socket: AuthenticatedSocket): string | null => {
  const authToken = socket.handshake.auth.token;
  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim();
  }

  const headerToken = extractBearerToken(socket.handshake.headers.authorization);
  if (headerToken) {
    return headerToken;
  }

  const queryToken = socket.handshake.query.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }

  return null;
};

export const socketAuthMiddleware = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    const token = getSocketToken(socket);
    if (!token) {
      return next(new Error('Unauthorized access. Provide an access token.'));
    }

    const decoded = jwtHelpers.verifyToken(token, config.jwt.accessSecret, 'access');
    const user = await User.findById(decoded.userId).select('isBlocked').lean();

    if (!user) {
      return next(new Error('User no longer exists'));
    }

    if (user.isBlocked) {
      return next(new Error('User is blocked'));
    }

    socket.data.user = decoded;
    return next();
  } catch (_error) {
    return next(new Error('Invalid or expired access token'));
  }
};
