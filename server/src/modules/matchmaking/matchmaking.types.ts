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

/* ── Mode-Specific Configuration ── */

interface ModeConfig {
  weights: { LEVEL: number; KNOWLEDGE_TIER: number; XP: number; ELO: number };
  thresholds: { LEVEL_DIFF: number; XP_RATIO: number; ELO_DIFF: number };
  strictPeriodMs: number;
  relaxationRate: number;
  requireTierMatch: boolean;
}

/**
 * Quick Match — casual, broad matching.
 * Prioritizes finding someone at a similar learning stage.
 * ELO matters less; level and knowledge tier matter more.
 */
const QUICK_MATCH_CONFIG: ModeConfig = {
  weights: { LEVEL: 0.35, KNOWLEDGE_TIER: 0.30, XP: 0.20, ELO: 0.15 },
  thresholds: { LEVEL_DIFF: 3, XP_RATIO: 0.30, ELO_DIFF: 300 },
  strictPeriodMs: 10000,     // 10s strict, then relax quickly
  relaxationRate: 0.15,      // Relaxes faster — find a match sooner
  requireTierMatch: false,   // Knowledge tier is preferred but not required
};

/**
 * Ranked Battle — competitive, ELO-focused matching.
 * Prioritizes pairing players with close ELO ratings.
 * Level and XP are secondary; knowledge tier is ignored.
 */
const RANKED_CONFIG: ModeConfig = {
  weights: { LEVEL: 0.10, KNOWLEDGE_TIER: 0.00, XP: 0.10, ELO: 0.80 },
  thresholds: { LEVEL_DIFF: 5, XP_RATIO: 0.50, ELO_DIFF: 150 },
  strictPeriodMs: 15000,     // 15s strict ELO matching
  relaxationRate: 0.08,      // Relaxes slower — quality matches matter
  requireTierMatch: false,   // Tier is completely ignored in ranked
};

export function getModeConfig(mode: 'quick_match' | 'ranked'): ModeConfig {
  return mode === 'ranked' ? RANKED_CONFIG : QUICK_MATCH_CONFIG;
}

/* ── Shared Configuration ── */

export const MATCHMAKING_CONFIG = {
  /** How often the matchmaking loop runs (ms) */
  TICK_INTERVAL_MS: 2000,
  /** Maximum queue time before auto-remove (ms) */
  MAX_QUEUE_TIME_MS: 60000,
} as const;
