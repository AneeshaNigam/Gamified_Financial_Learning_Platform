import { Request } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';

import { env } from '../config/env';
import { UserModel, IUserDocument } from '../models/User';
import logger from '../utils/logger';

interface TokenPayload {
  sub: string;
}

/**
 * Augment Socket with authenticated user data.
 */
export interface AuthenticatedSocket extends Socket {
  userId: string;
  user: IUserDocument;
}

/**
 * Socket.io middleware that verifies JWT tokens from the handshake auth object.
 * Attaches `userId` and `user` to the socket instance.
 *
 * Clients must connect with: io({ auth: { token: 'Bearer xxx' } })
 */
export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: ExtendedError) => void
): Promise<void> => {
  try {
    const token = extractToken(socket);

    if (!token) {
      return next(new Error('Authentication required: no token provided'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET as Secret) as TokenPayload;
    const user = await UserModel.findById(decoded.sub);

    if (!user) {
      return next(new Error('Authentication failed: user not found'));
    }

    // Attach to socket for downstream handlers
    (socket as AuthenticatedSocket).userId = user.id;
    (socket as AuthenticatedSocket).user = user;

    logger.debug({ userId: user.id, socketId: socket.id }, 'Socket authenticated');
    next();
  } catch (err) {
    logger.warn({ err, socketId: socket.id }, 'Socket authentication failed');
    next(new Error('Authentication failed: invalid token'));
  }
};

/**
 * Extract JWT from socket handshake.
 * Supports both `auth.token` (preferred) and query parameter fallback.
 */
function extractToken(socket: Socket): string | null {
  // Preferred: auth object
  const authToken = socket.handshake.auth?.token as string | undefined;
  if (authToken) {
    return authToken.startsWith('Bearer ') ? authToken.slice(7) : authToken;
  }

  // Fallback: query parameter (for environments that don't support auth headers)
  const queryToken = socket.handshake.query?.token as string | undefined;
  if (queryToken) {
    return queryToken.startsWith('Bearer ') ? queryToken.slice(7) : queryToken;
  }

  return null;
}
