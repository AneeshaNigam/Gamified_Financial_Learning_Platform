import { Types } from 'mongoose';

/* ── Battle State ── */

export type BattleStatus = 'waiting' | 'in_progress' | 'completed' | 'abandoned' | 'forfeited';
export type BattleType = 'quick_match' | 'private_room' | 'ranked';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface BattleConfig {
  totalQuestions: number;
  timePerQuestion: number;   // seconds
  maxPlayers: number;
}

export interface BattlePlayerState {
  userId: string;
  name: string;
  eloRatingBefore: number;
  score: number;
  answeredQuestions: Set<number>;  // question indexes answered
  connected: boolean;
  forfeited: boolean;
  disconnectTimer: NodeJS.Timeout | null;
  answers: AnswerRecord[];
}

export interface AnswerRecord {
  questionIndex: number;
  selectedOption: string | null;
  isCorrect: boolean;
  responseTimeMs: number;
  submittedAt: Date;
}

export interface BattleQuestionRuntime {
  questionId: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  topic: string;
  difficulty: Difficulty;
  timeLimit: number;
  sentAt: number | null;      // timestamp when question was sent
}

export interface BattleState {
  battleId: string;
  roomId: string;
  type: BattleType;
  status: BattleStatus;
  players: Map<string, BattlePlayerState>;
  questions: BattleQuestionRuntime[];
  config: BattleConfig;
  currentQuestionIndex: number;
  questionTimer: NodeJS.Timeout | null;
  timerSyncInterval: NodeJS.Timeout | null;
  startedAt: number | null;
}

/* ── Socket Event Payloads ── */

export interface JoinQueuePayload {
  mode: 'quick_match' | 'ranked';
}

export interface MatchFoundPayload {
  roomId: string;
  battleId: string;
  opponent: {
    name: string;
    level: number;
    rating: number;
    avatar?: string;
  };
}

export interface BattleStartPayload {
  battleId: string;
  roomId: string;
  config: BattleConfig;
  questionCount: number;
  startTime: number;           // server timestamp
  opponent: {
    name: string;
    level: number;
    rating: number;
  };
}

export interface QuestionSendPayload {
  index: number;
  questionText: string;
  options: { id: string; text: string }[];
  timeLimit: number;
  serverTimestamp: number;
  totalQuestions: number;
}

export interface AnswerSubmitPayload {
  roomId: string;
  questionIndex: number;
  optionId: string;
  clientTimestamp: number;
}

export interface AnswerAckPayload {
  accepted: boolean;
  questionIndex: number;
  reason?: string;
}

export interface ScoreUpdatePayload {
  scores: { userId: string; name: string; score: number }[];
  questionIndex: number;
  correctAnswer: string;
  explanation?: string;
  yourResult: {
    isCorrect: boolean;
    pointsEarned: number;
    responseTimeMs: number;
  };
}

export interface TimerSyncPayload {
  remaining: number;           // seconds remaining
  serverTimestamp: number;
}

export interface BattleEndPayload {
  battleId: string;
  result: 'win' | 'loss' | 'draw';
  finalScores: { userId: string; name: string; score: number; accuracy: number }[];
  eloChange: number;
  newRating: number;
  xpEarned: number;
  analytics: PostMatchAnalytics;
}

export interface PostMatchAnalytics {
  accuracy: number;
  avgResponseTimeMs: number;
  fastestResponseMs: number;
  slowestResponseMs: number;
  topicBreakdown: {
    topic: string;
    correct: number;
    total: number;
    accuracy: number;
  }[];
  strongTopics: string[];
  weakTopics: string[];
}

export interface OpponentDisconnectPayload {
  gracePeriodSeconds: number;
}

/* ── Matchmaking ── */

export interface QueueEntry {
  userId: string;
  name: string;
  level: number;
  knowledgeLevel: string;
  xp: number;
  eloRating: number;
  socketId: string;
  joinedAt: number;            // timestamp
  mode: 'quick_match' | 'ranked';
}

export interface QueueStatusPayload {
  position: number;
  estimatedWaitSeconds: number;
  inQueue: boolean;
}

/* ── Room ── */

export interface CreateRoomPayload {
  config?: Partial<BattleConfig>;
  topics?: string[];
}

export interface RoomCreatedPayload {
  roomCode: string;
  roomId: string;
}

export interface JoinRoomPayload {
  code: string;
}

export interface RoomUpdatePayload {
  roomId: string;
  code: string;
  status: string;
  players: {
    userId: string;
    name: string;
    isReady: boolean;
  }[];
}

export interface PlayerReadyPayload {
  roomId: string;
}

/* ── Score Calculation ── */

export const SCORE_CONFIG = {
  BASE_POINTS: { easy: 100, medium: 200, hard: 300 } as Record<string, number>,
  TIME_BONUS_FACTOR: 0.5,       // max 50% bonus for instant answer
  MAX_TIME_MS: 15000,            // max time for time bonus calculation
  DISCONNECT_GRACE_PERIOD: 30,   // seconds
  FORFEIT_ELO_FACTOR: 0.75,     // reduced ELO change on forfeit
  MIN_RATING: 100,               // floor
  INITIAL_RATING: 1200,
  IDLE_FORFEIT_THRESHOLD: 3,     // consecutive timeouts before auto-forfeit
} as const;
