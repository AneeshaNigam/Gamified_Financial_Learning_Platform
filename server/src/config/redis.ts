import Redis from 'ioredis';
import logger from '../utils/logger';
import { env } from './env';

let redisClient: Redis | null = null;
let redisPub: Redis | null = null;
let redisSub: Redis | null = null;

/**
 * Returns the main Redis client singleton.
 * Lazily creates the connection on first call.
 */
export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = createRedisConnection('main');
  }
  return redisClient;
};

/**
 * Returns dedicated pub/sub clients for the Socket.io Redis adapter.
 * Socket.io requires two separate Redis connections for pub and sub.
 */
export const getRedisPubSub = (): { pub: Redis; sub: Redis } => {
  if (!redisPub) {
    redisPub = createRedisConnection('pub');
  }
  if (!redisSub) {
    redisSub = createRedisConnection('sub');
  }
  return { pub: redisPub, sub: redisSub };
};

function createRedisConnection(label: string): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000);
      logger.warn({ attempt: times, delay }, `Redis ${label}: reconnecting...`);
      return delay;
    },
    reconnectOnError(err: Error) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((e) => err.message.includes(e));
    },
    lazyConnect: false,
    enableReadyCheck: true,
    connectTimeout: 10000,
  });

  client.on('connect', () => {
    logger.info(`Redis ${label}: connected`);
  });

  client.on('ready', () => {
    logger.info(`Redis ${label}: ready`);
  });

  client.on('error', (err: Error) => {
    logger.error({ err }, `Redis ${label}: error`);
  });

  client.on('close', () => {
    logger.warn(`Redis ${label}: connection closed`);
  });

  return client;
}

/**
 * Gracefully close all Redis connections.
 */
export const disconnectRedis = async (): Promise<void> => {
  const clients = [redisClient, redisPub, redisSub].filter(Boolean) as Redis[];
  await Promise.all(clients.map((c) => c.quit().catch(() => c.disconnect())));
  redisClient = null;
  redisPub = null;
  redisSub = null;
  logger.info('Redis: all connections closed');
};
