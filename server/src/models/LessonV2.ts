import mongoose, { Schema, Document, Types } from 'mongoose';

/** Step types — extensible for future AI-generated content */
export interface IInfoStep {
  type: 'info';
  content: string;       // markdown-friendly text
  emoji?: string;        // optional illustrative emoji
  xp: number;
}

export interface IMcqOption {
  id: string;
  text: string;
}

export interface IMcqStep {
  type: 'mcq';
  question: string;
  options: IMcqOption[];
  correctAnswer: string;  // matches option.id
  explanation: string;
  xp: number;
}

export type IStep = IInfoStep | IMcqStep;

export interface ILessonV2 extends Document {
  /** Global sequential order for auto-advancement */
  order: number;
  moduleId: number;
  lessonId: string;
  title: string;
  steps: IStep[];
  xpReward: number;      // bonus XP on lesson completion
  lucreReward: number;
  isActive: boolean;
  /** ISO tag so AI-generated lessons can be identified */
  source: 'seed' | 'ai' | 'manual';
  /** Adaptive learning metadata */
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: Date;
  updatedAt: Date;
}

const McqOptionSchema = new Schema<IMcqOption>(
  { id: { type: String, required: true }, text: { type: String, required: true } },
  { _id: false }
);

const StepSchema = new Schema<IStep>(
  {
    type: { type: String, required: true, enum: ['info', 'mcq'] },
    // info
    content: String,
    emoji: String,
    // mcq
    question: String,
    options: [McqOptionSchema],
    correctAnswer: String,
    explanation: String,
    // common
    xp: { type: Number, default: 10 },
  },
  { _id: false }
);

const LessonV2Schema = new Schema<ILessonV2>(
  {
    order: { type: Number, required: true },
    moduleId: { type: Number, required: true },
    lessonId: { type: String, required: true },
    title: { type: String, required: true },
    steps: [StepSchema],
    xpReward: { type: Number, default: 25 },
    lucreReward: { type: Number, default: 20 },
    isActive: { type: Boolean, default: true },
    source: { type: String, enum: ['seed', 'ai', 'manual'], default: 'seed' },
    topic: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  },
  { timestamps: true }
);

LessonV2Schema.index({ moduleId: 1, lessonId: 1 }, { unique: true });
LessonV2Schema.index({ order: 1 });
LessonV2Schema.index({ topic: 1, difficulty: 1 });

export const LessonV2Model = mongoose.model<ILessonV2>('LessonV2', LessonV2Schema);
