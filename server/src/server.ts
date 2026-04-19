import http from 'http';

import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initializeSocketServer } from './config/socket';
import { disconnectRedis } from './config/redis';
import { registerSocketHandlers } from './modules/battle/battle.socket';
import { registerPresenceHandlers } from './modules/presence/presence.socket';
import { registerMatchmakingHandlers } from './modules/matchmaking/matchmaking.socket';
import { registerRoomHandlers } from './modules/room/room.socket';
import logger from './utils/logger';

export const startServer = async () => {
  await connectDatabase();

  const server = http.createServer(app);

  // Initialize Socket.io with Redis adapter
  const io = initializeSocketServer(server);

  // Register all socket event handlers
  registerPresenceHandlers(io);
  registerMatchmakingHandlers(io);
  registerRoomHandlers(io);
  registerSocketHandlers(io);

  server.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
    logger.info(`Socket.io ready for connections`);
  });

  const shutdown = async () => {
    logger.info('Shutting down server...');
    server.close(async () => {
      await disconnectRedis();
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return server;
};
