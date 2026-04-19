import mongoose, { Schema, Document, Types } from 'mongoose';

/* ── Sub-document Interfaces ── */

export interface IBattleAnswer {
  questionIndex: number;
  selectedOption: string | null;   // null = timed out
  isCorrect: boolean;
  responseTimeMs: number;
  submittedAt: Date;
}

export interface IBattlePlayer {
  userId: Types.ObjectId;
  name: string;
  eloRatingBefore: number;
  eloRatingAfter: number;
  score: number;
  answers: IBattleAnswer[];
  accuracy: number;                // 0-100 percentage
  avgResponseTimeMs: number;
  connected: boolean;
  forfeited: boolean;
}

export interface IBattleQuestion {
  questionId: Types.ObjectId;
  questionText: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;              // seconds
}

export interface IBattleConfig {
  totalQuestions: number;
  timePerQuestion: number;        // seconds
  maxPlayers: number;
}

/* ── Main Interface ── */

export interface IBattle extends Document {
  roomId: string;
  type: 'quick_match' | 'private_room' | 'ranked';
  status: 'waiting' | 'in_progress' | 'completed' | 'abandoned' | 'forfeited';
  players: IBattlePlayer[];
  questions: IBattleQuestion[];
  config: IBattleConfig;
  currentQuestionIndex: number;
  winnerId: Types.ObjectId | null;
  isDraw: boolean;
  xpAwarded: Map<string, number>;
  startedAt: Date | null;
  endedAt: Date | null;
  duration: number;               // seconds
  createdAt: Date;
  updatedAt: Date;
}

/* ── Schemas ── */

const BattleAnswerSchema = new Schema<IBattleAnswer>(
  {
    questionIndex: { type: Number, required: true },
    selectedOption: { type: String, default: null },
    isCorrect: { type: Boolean, required: true },
    responseTimeMs: { type: Number, required: true },
    submittedAt: { type: Date, required: true },
  },
  { _id: false }
);

const BattlePlayerSchema = new Schema<IBattlePlayer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    eloRatingBefore: { type: Number, required: true },
    eloRatingAfter: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    answers: [BattleAnswerSchema],
    accuracy: { type: Number, default: 0 },
    avgResponseTimeMs: { type: Number, default: 0 },
    connected: { type: Boolean, default: true },
    forfeited: { type: Boolean, default: false },
  },
  { _id: false }
);

const BattleQuestionSchema = new Schema<IBattleQuestion>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'QuestionBank', required: true },
    questionText: { type: String, required: true },
    options: [
      {
        id: { type: String, required: true },
        text: { type: String, required: true },
        _id: false,
      },
    ],
    correctAnswer: { type: String, required: true },
    topic: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    timeLimit: { type: Number, default: 15 },
  },
  { _id: false }
);

const BattleConfigSchema = new Schema<IBattleConfig>(
  {
    totalQuestions: { type: Number, default: 10 },
    timePerQuestion: { type: Number, default: 15 },
    maxPlayers: { type: Number, default: 2 },
  },
  { _id: false }
);

const BattleSchema = new Schema<IBattle>(
  {
    roomId: { type: String, required: true, unique: true },
    type: {
      type: String,
      required: true,
      enum: ['quick_match', 'private_room', 'ranked'],
      default: 'quick_match',
    },
    status: {
      type: String,
      required: true,
      enum: ['waiting', 'in_progress', 'completed', 'abandoned', 'forfeited'],
      default: 'waiting',
    },
    players: {
      type: [BattlePlayerSchema],
      required: true,
      validate: {
        validator: (v: IBattlePlayer[]) => v.length <= 2,
        message: 'Battle supports max 2 players',
      },
    },
    questions: [BattleQuestionSchema],
    config: { type: BattleConfigSchema, required: true },
    currentQuestionIndex: { type: Number, default: 0 },
    winnerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isDraw: { type: Boolean, default: false },
    xpAwarded: { type: Map, of: Number, default: new Map() },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    duration: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* ── Indexes ── */

// Find battles by participant
BattleSchema.index({ 'players.userId': 1 });

// Status-based queries (active battles, history)
BattleSchema.index({ status: 1, createdAt: -1 });

// Type + status combination
BattleSchema.index({ type: 1, status: 1 });

// Recent battles
BattleSchema.index({ endedAt: -1 });

export const BattleModel = mongoose.model<IBattle>('Battle', BattleSchema);
