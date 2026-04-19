import mongoose, { Schema, Document, Types } from 'mongoose';

/* ── Interfaces ── */

export interface IBattleRoomPlayer {
  userId: Types.ObjectId;
  name: string;
  isReady: boolean;
  joinedAt: Date;
}

export interface IBattleRoomConfig {
  totalQuestions: number;
  timePerQuestion: number;
  topics: string[];
}

export interface IBattleRoom extends Document {
  code: string;                     // 6-char uppercase alphanumeric
  createdBy: Types.ObjectId;
  status: 'waiting' | 'ready' | 'started' | 'expired';
  players: IBattleRoomPlayer[];
  config: IBattleRoomConfig;
  battleId: Types.ObjectId | null;  // linked once battle starts
  expiresAt: Date;
  createdAt: Date;
}

/* ── Schemas ── */

const BattleRoomPlayerSchema = new Schema<IBattleRoomPlayer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    isReady: { type: Boolean, default: false },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const BattleRoomConfigSchema = new Schema<IBattleRoomConfig>(
  {
    totalQuestions: { type: Number, default: 10, min: 5, max: 20 },
    timePerQuestion: { type: Number, default: 15, min: 10, max: 30 },
    topics: [{ type: String, lowercase: true, trim: true }],
  },
  { _id: false }
);

const BattleRoomSchema = new Schema<IBattleRoom>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      minlength: 6,
      maxlength: 6,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      required: true,
      enum: ['waiting', 'ready', 'started', 'expired'],
      default: 'waiting',
    },
    players: {
      type: [BattleRoomPlayerSchema],
      validate: {
        validator: (v: IBattleRoomPlayer[]) => v.length <= 2,
        message: 'Room supports max 2 players',
      },
    },
    config: { type: BattleRoomConfigSchema, default: () => ({}) },
    battleId: { type: Schema.Types.ObjectId, ref: 'Battle', default: null },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    },
  },
  { timestamps: true }
);

/* ── Indexes ── */

// Lookup by code (primary)
BattleRoomSchema.index({ code: 1 }, { unique: true });

// TTL index: MongoDB automatically deletes expired documents
BattleRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Find rooms by creator
BattleRoomSchema.index({ createdBy: 1 });

// Active rooms
BattleRoomSchema.index({ status: 1 });

export const BattleRoomModel = mongoose.model<IBattleRoom>('BattleRoom', BattleRoomSchema);
