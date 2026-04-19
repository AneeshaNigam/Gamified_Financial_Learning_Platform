import mongoose, { Schema, Document, Types } from 'mongoose';

/* ── Interface ── */

export interface IRatingHistory extends Document {
  userId: Types.ObjectId;
  battleId: Types.ObjectId;
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number;
  opponentRating: number;
  opponentId: Types.ObjectId;
  result: 'win' | 'loss' | 'draw';
  timestamp: Date;
}

/* ── Schema ── */

const RatingHistorySchema = new Schema<IRatingHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    battleId: { type: Schema.Types.ObjectId, ref: 'Battle', required: true },
    ratingBefore: { type: Number, required: true },
    ratingAfter: { type: Number, required: true },
    ratingChange: { type: Number, required: true },
    opponentRating: { type: Number, required: true },
    opponentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    result: {
      type: String,
      required: true,
      enum: ['win', 'loss', 'draw'],
    },
    timestamp: { type: Date, default: () => new Date() },
  },
  { timestamps: false } // timestamp field is manual for precision
);

/* ── Indexes ── */

// User's rating timeline (most recent first)
RatingHistorySchema.index({ userId: 1, timestamp: -1 });

// Lookup by battle
RatingHistorySchema.index({ battleId: 1 });

export const RatingHistoryModel = mongoose.model<IRatingHistory>('RatingHistory', RatingHistorySchema);
