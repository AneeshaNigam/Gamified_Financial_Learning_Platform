import { getRedisClient } from '../../config/redis';
import { emitToUser } from '../../config/socket';
import { UserModel } from '../../models/User';
import { BattleModel } from '../../models/Battle';
import { BattleEngine } from '../battle/battle.engine';
import { selectAdaptiveQuestions } from '../adaptive/adaptive.service';
import { BattleQuestionRuntime } from '../battle/battle.types';
import {
  MatchmakingQueueEntry,
  MatchResult,
  MATCHMAKING_CONFIG,
  getModeConfig,
} from './matchmaking.types';
import logger from '../../utils/logger';
import crypto from 'crypto';

const QUEUE_KEY = 'matchmaking:queue';
const ACTIVE_KEY = 'matchmaking:active';
const META_PREFIX = 'matchmaking:meta:';

let matchmakingInterval: ReturnType<typeof setInterval> | null = null;

/* ── Queue Management ── */

export async function addToQueue(entry: MatchmakingQueueEntry): Promise<void> {
  const redis = getRedisClient();

  // Check if user is already in an active battle
  const user = await UserModel.findById(entry.userId).select('activeBattleId presenceStatus');
  if (user?.activeBattleId) {
    emitToUser(entry.userId, 'queue_error', { message: 'Cannot join queue while in a battle' });
    return;
  }

  // Check if already in queue
  const existing = await redis.zscore(QUEUE_KEY, entry.userId);
  if (existing !== null) {
    emitToUser(entry.userId, 'queue_error', { message: 'Already in queue' });
    return;
  }

  // Check if in active set
  const isActive = await redis.sismember(ACTIVE_KEY, entry.userId);
  if (isActive) {
    emitToUser(entry.userId, 'queue_error', { message: 'Already matched, battle starting' });
    return;
  }

  // Compute matchmaking score (composite of level + elo for sorted set ordering)
  const score = computeQueueScore(entry);

  // Add to sorted set
  await redis.zadd(QUEUE_KEY, score, entry.userId);

  // Store metadata
  await redis.hmset(`${META_PREFIX}${entry.userId}`, {
    userId: entry.userId,
    name: entry.name,
    level: String(entry.level),
    knowledgeLevel: entry.knowledgeLevel,
    xp: String(entry.xp),
    eloRating: String(entry.eloRating),
    socketId: entry.socketId,
    joinedAt: String(entry.joinedAt),
    mode: entry.mode,
  });
  await redis.expire(`${META_PREFIX}${entry.userId}`, 120); // 2 min TTL

  // Update presence
  await UserModel.findByIdAndUpdate(entry.userId, { presenceStatus: 'online' });

  // Send queue status
  const position = await redis.zrank(QUEUE_KEY, entry.userId);
  emitToUser(entry.userId, 'queue_status', {
    position: (position ?? 0) + 1,
    estimatedWaitSeconds: 15,
    inQueue: true,
  });

  logger.info({ userId: entry.userId, score }, 'Player added to matchmaking queue');
}

export async function removeFromQueue(userId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.zrem(QUEUE_KEY, userId);
  await redis.del(`${META_PREFIX}${userId}`);
  await redis.srem(ACTIVE_KEY, userId);

  emitToUser(userId, 'queue_status', {
    position: 0,
    estimatedWaitSeconds: 0,
    inQueue: false,
  });

  logger.debug({ userId }, 'Player removed from matchmaking queue');
}

/* ── Matchmaking Algorithm ── */

function computeQueueScore(entry: MatchmakingQueueEntry): number {
  // Composite score for sorted set ordering — groups similar players together
  return entry.eloRating * 1000 + entry.level;
}

async function getQueueEntries(): Promise<MatchmakingQueueEntry[]> {
  const redis = getRedisClient();
  const userIds = await redis.zrangebyscore(QUEUE_KEY, '-inf', '+inf');

  const entries: MatchmakingQueueEntry[] = [];
  for (const userId of userIds) {
    const meta = await redis.hgetall(`${META_PREFIX}${userId}`);
    if (meta && meta.userId) {
      entries.push({
        userId: meta.userId,
        name: meta.name,
        level: parseInt(meta.level, 10),
        knowledgeLevel: meta.knowledgeLevel,
        xp: parseInt(meta.xp, 10),
        eloRating: parseInt(meta.eloRating, 10),
        socketId: meta.socketId,
        joinedAt: parseInt(meta.joinedAt, 10),
        mode: meta.mode as 'quick_match' | 'ranked',
      });
    }
  }

  return entries;
}

function computeMatchScore(
  seeker: MatchmakingQueueEntry,
  candidate: MatchmakingQueueEntry,
  now: number
): number {
  const cfg = getModeConfig(seeker.mode);
  const timeInQueue = now - seeker.joinedAt;
  const relaxationPeriods = Math.max(0, timeInQueue - cfg.strictPeriodMs) / 5000;
  const relaxation = 1 + relaxationPeriods * cfg.relaxationRate;

  const w = cfg.weights;
  const t = cfg.thresholds;

  // Level score (0 = exact match, lower = better)
  const levelDiff = Math.abs(seeker.level - candidate.level);
  const levelThreshold = Math.ceil(t.LEVEL_DIFF * relaxation) + (relaxation > 1 ? Math.floor(relaxation) : 0);
  if (levelDiff > levelThreshold + 2) return -1; // Too far apart
  const levelScore = levelDiff <= levelThreshold ? 1 : Math.max(0, 1 - (levelDiff - levelThreshold) / 3);

  // Knowledge tier
  let tierScore: number;
  if (w.KNOWLEDGE_TIER === 0) {
    // Ranked mode: tier is irrelevant
    tierScore = 1;
  } else {
    const tierMatch = seeker.knowledgeLevel === candidate.knowledgeLevel;
    tierScore = tierMatch ? 1 : (relaxation > 1.5 ? 0.5 : 0);
    if (cfg.requireTierMatch && !tierMatch && relaxation < 1.5) return -1;
  }

  // XP range
  const xpRatio = t.XP_RATIO * relaxation;
  const seekerXp = Math.max(1, seeker.xp);
  const xpDiff = Math.abs(seeker.xp - candidate.xp) / seekerXp;
  if (xpDiff > xpRatio * 3) return -1;
  const xpScore = xpDiff <= xpRatio ? 1 : Math.max(0, 1 - (xpDiff - xpRatio) / xpRatio);

  // ELO range
  const eloDiff = Math.abs(seeker.eloRating - candidate.eloRating);
  const eloThreshold = t.ELO_DIFF * relaxation;
  if (eloDiff > eloThreshold * 2) return -1;
  const eloScore = eloDiff <= eloThreshold ? 1 : Math.max(0, 1 - (eloDiff - eloThreshold) / eloThreshold);

  const totalScore = w.LEVEL * levelScore + w.KNOWLEDGE_TIER * tierScore + w.XP * xpScore + w.ELO * eloScore;
  return totalScore;
}

function findBestMatch(
  seeker: MatchmakingQueueEntry,
  candidates: MatchmakingQueueEntry[],
  excluded: Set<string>,
  now: number
): MatchmakingQueueEntry | null {
  let bestCandidate: MatchmakingQueueEntry | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    if (candidate.userId === seeker.userId) continue;
    if (excluded.has(candidate.userId)) continue;
    if (candidate.mode !== seeker.mode) continue;

    const score = computeMatchScore(seeker, candidate, now);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestScore > 0 ? bestCandidate : null;
}

/* ── Matchmaking Loop ── */

async function runMatchmakingTick(): Promise<void> {
  try {
    const entries = await getQueueEntries();
    if (entries.length < 2) return;

    const now = Date.now();
    const matched = new Set<string>();
    const redis = getRedisClient();

    for (const entry of entries) {
      if (matched.has(entry.userId)) continue;

      // Check for timeout
      if (now - entry.joinedAt > MATCHMAKING_CONFIG.MAX_QUEUE_TIME_MS) {
        emitToUser(entry.userId, 'queue_timeout', { reason: 'no_match_found' });
        await removeFromQueue(entry.userId);
        continue;
      }

      const candidate = findBestMatch(entry, entries, matched, now);
      if (candidate) {
        matched.add(entry.userId);
        matched.add(candidate.userId);

        // Mark both as active (prevent re-matching)
        await redis.sadd(ACTIVE_KEY, entry.userId, candidate.userId);
        await redis.zrem(QUEUE_KEY, entry.userId, candidate.userId);

        // Create battle
        await createMatchedBattle(entry, candidate);
      }
    }
  } catch (err) {
    logger.error({ err }, 'Matchmaking tick error');
  }
}

async function createMatchedBattle(
  player1: MatchmakingQueueEntry,
  player2: MatchmakingQueueEntry
): Promise<void> {
  const roomId = crypto.randomBytes(12).toString('hex');
  const battleId = crypto.randomBytes(12).toString('hex');

  try {
    // Select adaptive questions
    const questions = await selectAdaptiveQuestions(player1.userId, player2.userId, 10);

    if (questions.length === 0) {
      logger.error({ p1: player1.userId, p2: player2.userId }, 'No questions available for battle');
      const redis = getRedisClient();
      await redis.srem(ACTIVE_KEY, player1.userId, player2.userId);
      emitToUser(player1.userId, 'queue_error', { message: 'No questions available. Please try again later.' });
      emitToUser(player2.userId, 'queue_error', { message: 'No questions available. Please try again later.' });
      return;
    }

    const runtimeQuestions: BattleQuestionRuntime[] = questions.map((q) => ({
      questionId: q._id?.toString() ?? q.id,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      topic: q.topic,
      difficulty: q.difficulty,
      timeLimit: 15,
      sentAt: null,
    }));

    // Create battle document in MongoDB
    await BattleModel.create({
      roomId,
      type: player1.mode === 'ranked' ? 'ranked' : 'quick_match',
      status: 'waiting',
      players: [
        { userId: player1.userId, name: player1.name, eloRatingBefore: player1.eloRating },
        { userId: player2.userId, name: player2.name, eloRatingBefore: player2.eloRating },
      ],
      config: { totalQuestions: 10, timePerQuestion: 15, maxPlayers: 2 },
    });

    // Create battle engine
    const engine = new BattleEngine(
      battleId,
      roomId,
      player1.mode === 'ranked' ? 'ranked' : 'quick_match',
      [
        { userId: player1.userId, name: player1.name, eloRating: player1.eloRating },
        { userId: player2.userId, name: player2.name, eloRating: player2.eloRating },
      ],
      runtimeQuestions,
      { totalQuestions: 10, timePerQuestion: 15, maxPlayers: 2 }
    );

    // Notify both players
    emitToUser(player1.userId, 'match_found', {
      roomId,
      battleId,
      opponent: { name: player2.name, level: player2.level, rating: player2.eloRating },
    });

    emitToUser(player2.userId, 'match_found', {
      roomId,
      battleId,
      opponent: { name: player1.name, level: player1.level, rating: player1.eloRating },
    });

    // Clean up queue metadata
    const redis = getRedisClient();
    await redis.del(`${META_PREFIX}${player1.userId}`, `${META_PREFIX}${player2.userId}`);
    await redis.srem(ACTIVE_KEY, player1.userId, player2.userId);

    logger.info(
      { battleId, roomId, p1: player1.userId, p2: player2.userId },
      'Match created'
    );
  } catch (err) {
    logger.error({ err, p1: player1.userId, p2: player2.userId }, 'Failed to create matched battle');

    // Put players back in queue on failure
    const redis = getRedisClient();
    await redis.srem(ACTIVE_KEY, player1.userId, player2.userId);
    emitToUser(player1.userId, 'queue_error', { message: 'Match creation failed, please retry' });
    emitToUser(player2.userId, 'queue_error', { message: 'Match creation failed, please retry' });
  }
}

/* ── Start / Stop ── */

export function startMatchmakingLoop(): void {
  if (matchmakingInterval) return;
  matchmakingInterval = setInterval(runMatchmakingTick, MATCHMAKING_CONFIG.TICK_INTERVAL_MS);
  logger.info('Matchmaking loop started');
}

export function stopMatchmakingLoop(): void {
  if (matchmakingInterval) {
    clearInterval(matchmakingInterval);
    matchmakingInterval = null;
    logger.info('Matchmaking loop stopped');
  }
}
