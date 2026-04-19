import { getRedisClient } from '../../config/redis';
import logger from '../../utils/logger';

const RATE_LIMIT_PREFIX = 'anticheat:rate:';
const ANSWER_LOCK_PREFIX = 'anticheat:answer:';
const TAB_SWITCH_PREFIX = 'anticheat:tabswitch:';

/* ── Rate Limiting ── */

/**
 * Rate limit answer submissions: max 1 per 500ms per user.
 * Returns true if the submission is allowed, false if rate-limited.
 */
export async function checkAnswerRateLimit(userId: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const key = `${RATE_LIMIT_PREFIX}${userId}`;

    // SET NX with 500ms expiry — only succeeds if key doesn't exist
    const result = await redis.set(key, '1', 'PX', 500, 'NX');
    return result === 'OK';
  } catch (err) {
    logger.error({ err, userId }, 'Rate limit check failed');
    return true; // Allow on error (fail open)
  }
}

/* ── Answer Replay Prevention ── */

/**
 * Atomically lock an answer for a specific user, battle, and question.
 * Uses Redis SETNX — first write wins, preventing replay attacks.
 *
 * @returns true if this is the first (valid) submission, false if duplicate
 */
export async function lockAnswer(
  roomId: string,
  userId: string,
  questionIndex: number
): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const key = `${ANSWER_LOCK_PREFIX}${roomId}:q${questionIndex}:u${userId}`;

    // SET NX with 60s expiry — only the first write succeeds
    const result = await redis.set(key, Date.now().toString(), 'EX', 60, 'NX');
    return result === 'OK';
  } catch (err) {
    logger.error({ err, roomId, userId, questionIndex }, 'Answer lock check failed');
    return true;
  }
}

/* ── Tab Switch Tracking ── */

/**
 * Record a tab switch / visibility change event.
 * Stored for analytics — not used for auto-penalty (accessibility concern).
 */
export async function recordTabSwitch(
  userId: string,
  battleId: string,
  timestamp: number
): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `${TAB_SWITCH_PREFIX}${battleId}:${userId}`;
    await redis.rpush(key, timestamp.toString());
    await redis.expire(key, 3600); // 1 hour TTL
  } catch (err) {
    logger.error({ err, userId, battleId }, 'Tab switch recording failed');
  }
}

/**
 * Get tab switch count for a user in a battle.
 */
export async function getTabSwitchCount(
  userId: string,
  battleId: string
): Promise<number> {
  try {
    const redis = getRedisClient();
    const key = `${TAB_SWITCH_PREFIX}${battleId}:${userId}`;
    return await redis.llen(key);
  } catch {
    return 0;
  }
}

/* ── Bot Detection Heuristics ── */

/**
 * Analyze response time patterns for suspicious behavior.
 * Flags patterns that suggest automated play:
 * - Suspiciously consistent response times (< 50ms variance)
 * - Extremely fast responses (< 200ms consistently)
 *
 * @returns Suspicion score (0-1, where 1 = very suspicious)
 */
export function analyzeBotPatterns(responseTimes: number[]): {
  suspicionScore: number;
  flags: string[];
} {
  if (responseTimes.length < 3) {
    return { suspicionScore: 0, flags: [] };
  }

  const flags: string[] = [];
  let suspicionScore = 0;

  // Check for extremely fast responses
  const fastCount = responseTimes.filter((t) => t < 200).length;
  if (fastCount / responseTimes.length > 0.5) {
    flags.push('FAST_RESPONSES');
    suspicionScore += 0.4;
  }

  // Check for suspiciously consistent timing
  const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const variance =
    responseTimes.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / responseTimes.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev < 50 && responseTimes.length >= 5) {
    flags.push('CONSISTENT_TIMING');
    suspicionScore += 0.3;
  }

  // Check for programmatic patterns (exact intervals)
  const intervals = responseTimes.slice(1).map((t, i) => Math.abs(t - responseTimes[i]));
  const intervalVariance =
    intervals.length > 0
      ? intervals.reduce((sum, i) => sum + Math.pow(i - intervals[0], 2), 0) / intervals.length
      : Infinity;

  if (intervalVariance < 100 && intervals.length >= 3) {
    flags.push('PROGRAMMATIC_INTERVALS');
    suspicionScore += 0.3;
  }

  return {
    suspicionScore: Math.min(1, suspicionScore),
    flags,
  };
}

/* ── Cleanup ── */

/**
 * Clean up anti-cheat data for a completed battle.
 */
export async function cleanupBattleAntiCheat(roomId: string, playerIds: string[]): Promise<void> {
  try {
    const redis = getRedisClient();
    const keys: string[] = [];

    for (const userId of playerIds) {
      // Clean up all question answer locks
      for (let q = 0; q < 20; q++) {
        keys.push(`${ANSWER_LOCK_PREFIX}${roomId}:q${q}:u${userId}`);
      }
    }

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    logger.error({ err, roomId }, 'Anti-cheat cleanup failed');
  }
}
