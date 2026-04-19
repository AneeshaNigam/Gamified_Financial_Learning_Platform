import mongoose, { Schema, Document, Types } from 'mongoose';

/* ── Interfaces ── */

export interface IQuestionOption {
  id: string;
  text: string;
}

export interface IQuestionBank extends Document {
  questionText: string;
  options: IQuestionOption[];
  correctAnswer: string;       // matches option.id
  explanation: string;
  topic: string;               // e.g. "budgeting", "investing", "savings"
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];              // e.g. ["compound-interest", "stocks"]
  source: 'seed' | 'ai' | 'manual';
  timesUsed: number;
  avgCorrectRate: number;      // 0-1 range, updated after each battle
  avgResponseTimeMs: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Schemas ── */

const QuestionOptionSchema = new Schema<IQuestionOption>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const QuestionBankSchema = new Schema<IQuestionBank>(
  {
    questionText: { type: String, required: true },
    options: {
      type: [QuestionOptionSchema],
      required: true,
      validate: {
        validator: (v: IQuestionOption[]) => v.length >= 2 && v.length <= 6,
        message: 'Questions must have 2-6 options',
      },
    },
    correctAnswer: { type: String, required: true },
    explanation: { type: String, default: '' },
    topic: { type: String, required: true, lowercase: true, trim: true },
    difficulty: {
      type: String,
      required: true,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    tags: [{ type: String, lowercase: true, trim: true }],
    source: {
      type: String,
      enum: ['seed', 'ai', 'manual'],
      default: 'seed',
    },
    timesUsed: { type: Number, default: 0 },
    avgCorrectRate: { type: Number, default: 0, min: 0, max: 1 },
    avgResponseTimeMs: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* ── Indexes ── */

// Primary query: select questions by topic + difficulty for battles
QuestionBankSchema.index({ topic: 1, difficulty: 1, isActive: 1 });

// Tag-based lookup
QuestionBankSchema.index({ tags: 1 });

// Source filtering (find AI-generated questions)
QuestionBankSchema.index({ source: 1 });

// Difficulty calibration queries
QuestionBankSchema.index({ avgCorrectRate: 1 });

// Text search on question content
QuestionBankSchema.index({ questionText: 'text' });

/* ── Validation ── */

QuestionBankSchema.pre('save', function (next) {
  // Ensure correctAnswer matches one of the option IDs
  const validIds = this.options.map((o) => o.id);
  if (!validIds.includes(this.correctAnswer)) {
    return next(new Error(`correctAnswer "${this.correctAnswer}" must match one of the option IDs: ${validIds.join(', ')}`));
  }
  next();
});

export const QuestionBankModel = mongoose.model<IQuestionBank>('QuestionBank', QuestionBankSchema);
