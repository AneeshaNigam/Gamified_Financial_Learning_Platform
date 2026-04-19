import { getRedisClient } from '../../config/redis';
import { UserModel } from '../../models/User';
import logger from '../../utils/logger';

type PresenceStatus = 'online' | 'idle' | 'in-battle' | 'offline';

const PRESENCE_TTL = 30; // seconds — refreshed by heartbeat
const PRESENCE_PREFIX = 'presence:';

/* ── Set Presence ── */

export async function setPresence(userId: string, status: PresenceStatus): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.set(`${PRESENCE_PREFIX}${userId}`, status, 'EX', PRESENCE_TTL);
    await UserModel.findByIdAndUpdate(userId, {
      presenceStatus: status,
      lastHeartbeat: new Date(),
    });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to set presence');
  }
}

/* ── Get Presence ── */

export async function getPresence(userId: string): Promise<PresenceStatus> {
  try {
    const redis = getRedisClient();
    const status = await redis.get(`${PRESENCE_PREFIX}${userId}`);
    return (status as PresenceStatus) ?? 'offline';
  } catch {
    return 'offline';
  }
}

/* ── Refresh Heartbeat ── */

export async function refreshHeartbeat(userId: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const currentStatus = await redis.get(`${PRESENCE_PREFIX}${userId}`);

    if (currentStatus) {
      // Refresh TTL without changing status
      await redis.expire(`${PRESENCE_PREFIX}${userId}`, PRESENCE_TTL);
      await UserModel.findByIdAndUpdate(userId, { lastHeartbeat: new Date() });
    } else {
      // Re-establish presence
      await setPresence(userId, 'online');
    }
  } catch (err) {
    logger.error({ err, userId }, 'Failed to refresh heartbeat');
  }
}

/* ── Clear Presence (user goes offline) ── */

export async function clearPresence(userId: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.del(`${PRESENCE_PREFIX}${userId}`);
    await UserModel.findByIdAndUpdate(userId, {
      presenceStatus: 'offline',
    });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to clear presence');
  }
}

/* ── Get Online Count ── */

export async function getOnlineCount(): Promise<number> {
  try {
    const redis = getRedisClient();
    // Use SCAN to count presence keys
    let cursor = '0';
    let count = 0;
    do {
      const result = await redis.scan(cursor, 'MATCH', `${PRESENCE_PREFIX}*`, 'COUNT', 100);
      cursor = result[0];
      count += result[1].length;
    } while (cursor !== '0');
    return count;
  } catch {
    return 0;
  }
}
