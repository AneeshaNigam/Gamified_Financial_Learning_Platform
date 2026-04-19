export interface MatchmakingQueueEntry {
  userId: string;
  name: string;
  level: number;
  knowledgeLevel: string;
  xp: number;
  eloRating: number;
  socketId: string;
  joinedAt: number;
  mode: 'quick_match' | 'ranked';
}

export interface MatchResult {
  player1: MatchmakingQueueEntry;
  player2: MatchmakingQueueEntry;
  matchScore: number;
}

export const MATCHMAKING_CONFIG = {
  /** How often the matchmaking loop runs (ms) */
  TICK_INTERVAL_MS: 2000,
  /** Time before criteria start relaxing (ms) */
  STRICT_PERIOD_MS: 15000,
  /** Criteria relaxation rate (multiplier per 5s past strict period) */
  RELAXATION_RATE: 0.1,
  /** Maximum queue time before auto-remove (ms) */
  MAX_QUEUE_TIME_MS: 60000,
  /** Matching criteria weights */
  WEIGHTS: {
    LEVEL: 0.4,
    KNOWLEDGE_TIER: 0.3,
    XP: 0.2,
    ELO: 0.1,
  },
  /** Initial thresholds */
  THRESHOLDS: {
    LEVEL_DIFF: 0,           // exact match initially
    XP_RATIO: 0.2,           // ±20%
    ELO_DIFF: 200,           // ±200 points
  },
} as const;
