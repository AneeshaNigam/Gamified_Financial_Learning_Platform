/** @format */

/* ── Battle Types (mirrors server types) ── */

export type BattleStatus = "waiting" | "in_progress" | "completed" | "abandoned" | "forfeited";
export type BattleType = "quick_match" | "private_room" | "ranked";
export type BattleResult = "win" | "loss" | "draw";

export interface BattleConfig {
  totalQuestions: number;
  timePerQuestion: number;
  maxPlayers: number;
}

export interface QuestionOption {
  id: string;
  text: string;
}

/* ── Socket Event Payloads ── */

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
  startTime: number;
  opponent: {
    name: string;
    level: number;
    rating: number;
  };
}

export interface QuestionPayload {
  index: number;
  questionText: string;
  options: QuestionOption[];
  timeLimit: number;
  serverTimestamp: number;
  totalQuestions: number;
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
  remaining: number;
  serverTimestamp: number;
}

export interface BattleEndPayload {
  battleId: string;
  result: BattleResult;
  finalScores: {
    userId: string;
    name: string;
    score: number;
    accuracy: number;
  }[];
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

export interface QueueStatusPayload {
  position: number;
  estimatedWaitSeconds: number;
  inQueue: boolean;
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

export interface BattleStateSyncPayload {
  battleId: string;
  roomId: string;
  status: BattleStatus;
  currentQuestionIndex: number;
  scores: { userId: string; name: string; score: number }[];
  timeRemaining: number;
  serverTimestamp: number;
  currentQuestion: {
    index: number;
    questionText: string;
    options: QuestionOption[];
    timeLimit: number;
    alreadyAnswered: boolean;
  } | null;
}

/* ── REST API Response Types ── */

export interface BattleHistoryItem {
  battleId: string;
  type: BattleType;
  result: BattleResult;
  score: number;
  opponentScore: number;
  opponentName: string;
  accuracy: number;
  eloChange: number;
  questionsAnswered: number;
  duration: number;
  date: string;
}

export interface BattleAnalytics {
  totalBattles: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  winStreak: number;
  bestWinStreak: number;
  eloRating: number;
  averageAccuracy: number;
  averageResponseTimeMs: number;
  bestTopic: { topic: string; accuracy: number; total: number } | null;
  worstTopic: { topic: string; accuracy: number; total: number } | null;
  topicBreakdown: {
    topic: string;
    accuracy: number;
    total: number;
    avgResponseTimeMs: number;
  }[];
  recentForm: string[];
  ratingHistory: {
    date: string;
    rating: number;
    change: number;
    result: string;
  }[];
  totalXpEarned: number;
}

export interface BattleLeaderboardEntry {
  rank: number;
  name: string;
  level: number;
  eloRating: number;
  wins: number;
  losses: number;
  winRate: number;
  avatar?: string;
}

/* ── Client Battle State ── */

export type BattlePhase =
  | "idle"
  | "queuing"
  | "match_found"
  | "countdown"
  | "in_battle"
  | "reviewing_answer"
  | "battle_end"
  | "room_lobby"
  | "room_waiting";

export interface ClientBattleState {
  phase: BattlePhase;
  roomId: string | null;
  battleId: string | null;
  opponent: {
    name: string;
    level: number;
    rating: number;
    avatar?: string;
  } | null;
  config: BattleConfig | null;
  currentQuestion: QuestionPayload | null;
  myScore: number;
  opponentScore: number;
  timeRemaining: number;
  lastResult: ScoreUpdatePayload | null;
  selectedAnswer: string | null;
  answerLocked: boolean;
  battleResult: BattleEndPayload | null;
  // Room state
  roomCode: string | null;
  roomPlayers: { userId: string; name: string; isReady: boolean }[];
  // Queue state
  queueMode: "quick_match" | "ranked" | null;
  queuePosition: number;
  queueEstimate: number;
}

export const initialBattleState: ClientBattleState = {
  phase: "idle",
  roomId: null,
  battleId: null,
  opponent: null,
  config: null,
  currentQuestion: null,
  myScore: 0,
  opponentScore: 0,
  timeRemaining: 0,
  lastResult: null,
  selectedAnswer: null,
  answerLocked: false,
  battleResult: null,
  roomCode: null,
  roomPlayers: [],
  queueMode: null,
  queuePosition: 0,
  queueEstimate: 0,
};
