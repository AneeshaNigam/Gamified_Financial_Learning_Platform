import { Server as HttpServer } from 'http';
import { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

import { env } from './env';
import { getRedisPubSub } from './redis';
import { socketAuthMiddleware, AuthenticatedSocket } from '../middleware/socketAuth';
import logger from '../utils/logger';

// Re-export for convenience
export type { AuthenticatedSocket } from '../middleware/socketAuth';

let io: Server | null = null;

/**
 * Initialize Socket.io server with Redis adapter for horizontal scaling.
 * This must be called after HTTP server is created but before server.listen().
 */
export const initializeSocketServer = (httpServer: HttpServer): Server => {
  if (io) {
    logger.warn('Socket.io server already initialized');
    return io;
  }

  const allowedOrigins = [
    env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
  ].filter(Boolean) as string[];

  const options: Partial<ServerOptions> = {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    pingInterval: 10000,       // 10s heartbeat
    pingTimeout: 15000,        // 15s before disconnect
    connectTimeout: 10000,
    maxHttpBufferSize: 1e6,    // 1MB max message
    transports: ['websocket', 'polling'], // prefer websocket
  };

  io = new Server(httpServer, options);

  // Attach Redis adapter for cross-instance communication
  if (env.REDIS_URL) {
    try {
      const { pub, sub } = getRedisPubSub();
      io.adapter(createAdapter(pub, sub));
      logger.info('Socket.io: Redis adapter attached');
    } catch (err) {
      logger.error({ err }, 'Socket.io: Failed to attach Redis adapter, falling back to in-memory');
    }
  } else {
    logger.warn('Socket.io: No REDIS_URL configured, using in-memory adapter (single instance only)');
  }

  // Global auth middleware — every connection must have a valid JWT
  io.use(socketAuthMiddleware);

  // Connection tracking
  io.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    logger.info(
      { userId: socket.userId, socketId: socket.id },
      'Socket connected'
    );

    // Join personal room for direct messages
    socket.join(`user:${socket.userId}`);

    socket.on('disconnect', (reason) => {
      logger.info(
        { userId: socket.userId, socketId: socket.id, reason },
        'Socket disconnected'
      );
    });

    socket.on('error', (err) => {
      logger.error(
        { err, userId: socket.userId, socketId: socket.id },
        'Socket error'
      );
    });
  });

  logger.info('Socket.io: server initialized');
  return io;
};

/**
 * Get the initialized Socket.io server instance.
 * Throws if called before initialization.
 */
export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io server not initialized. Call initializeSocketServer() first.');
  }
  return io;
};

/**
 * Emit an event to a specific user by their userId.
 * Works across multiple Node.js instances via the Redis adapter.
 */
export const emitToUser = (userId: string, event: string, data: unknown): void => {
  getIO().to(`user:${userId}`).emit(event, data);
};

/**
 * Emit an event to all sockets in a battle room.
 */
export const emitToBattle = (roomId: string, event: string, data: unknown): void => {
  getIO().to(`battle:${roomId}`).emit(event, data);
};
