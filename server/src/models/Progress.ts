import { Schema, model, Document, Types } from 'mongoose';

export interface IQuizScore {
  quizId: string;
  score: number;
  total: number;
  timeSpent: number;
  date: Date;
}

export interface IAchievementState {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  total?: number;
}

export interface ITopicStat {
  correct: number;
  wrong: number;
}

export interface IProgress {
  user: Types.ObjectId;
  currentModule: number;
  completedModules: number[];
  completedLessons: string[];
  quizScores: IQuizScore[];
  achievements: IAchievementState[];
  // Behavior tracking
  totalXP: number;
  accuracy: number;
  averageResponseTime: number;
  totalAnswered: number;
  totalCorrect: number;
  totalResponseTime: number;
  topicStats: Map<string, ITopicStat>;
}

export interface IProgressDocument extends IProgress, Document {}

const quizScoreSchema = new Schema<IQuizScore>(
  {
    quizId: { type: String, required: true },
    score: Number,
    total: Number,
    timeSpent: Number,
    date: { type: Date, default: () => new Date() }
  },
  { _id: false }
);

const achievementSchema = new Schema<IAchievementState>(
  {
    id: { type: String, required: true },
    name: String,
    description: String,
    icon: String,
    xpReward: Number,
    unlocked: { type: Boolean, default: false },
    unlockedAt: Date,
    progress: { type: Number, default: 0 },
    total: Number
  },
  { _id: false }
);

const topicStatSchema = new Schema<ITopicStat>(
  {
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
  },
  { _id: false }
);

const progressSchema = new Schema<IProgressDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    currentModule: { type: Number, default: 1 },
    completedModules: { type: [Number], default: [] },
    completedLessons: { type: [String], default: [] },
    quizScores: { type: [quizScoreSchema], default: [] },
    achievements: { type: [achievementSchema], default: [] },
    // Behavior tracking
    totalXP: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    totalAnswered: { type: Number, default: 0 },
    totalCorrect: { type: Number, default: 0 },
    totalResponseTime: { type: Number, default: 0 },
    topicStats: { type: Map, of: topicStatSchema, default: new Map() },
  },
  { timestamps: true }
);

export const ProgressModel = model<IProgressDocument>('Progress', progressSchema);

