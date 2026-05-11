"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressModel = void 0;
const mongoose_1 = require("mongoose");
const quizScoreSchema = new mongoose_1.Schema({
    quizId: { type: String, required: true },
    score: Number,
    total: Number,
    timeSpent: Number,
    date: { type: Date, default: () => new Date() }
}, { _id: false });
const achievementSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    name: String,
    description: String,
    icon: String,
    xpReward: Number,
    unlocked: { type: Boolean, default: false },
    unlockedAt: Date,
    progress: { type: Number, default: 0 },
    total: Number
}, { _id: false });
const topicStatSchema = new mongoose_1.Schema({
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
}, { _id: false });
const progressSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
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
}, { timestamps: true });
exports.ProgressModel = (0, mongoose_1.model)('Progress', progressSchema);
