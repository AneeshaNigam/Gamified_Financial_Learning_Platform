import logger from '../../utils/logger';
import { getRedisClient } from '../../config/redis';
import { emitToBattle } from '../../config/socket';
import {
  BattleState,
  BattlePlayerState,
  BattleQuestionRuntime,
  BattleConfig,
  AnswerRecord,
  BattleType,
  SCORE_CONFIG,
  QuestionSendPayload,
  ScoreUpdatePayload,
  TimerSyncPayload,
  BattleEndPayload,
  PostMatchAnalytics,
} from './battle.types';
import { BattleModel, IBattle } from '../../models/Battle';
import { UserModel } from '../../models/User';
import { calculateEloChanges } from '../rating/rating.service';
import { updateLearningProfile } from '../adaptive/adaptive.profile';
import { updateQuestionStats } from '../adaptive/adaptive.service';

/* ── Active battles in-memory store ── */
const activeBattles = new Map<string, BattleEngine>();

export function getActiveBattle(roomId: string): BattleEngine | undefined {
  return activeBattles.get(roomId);
}

export function getAllActiveBattles(): Map<string, BattleEngine> {
  return activeBattles;
}

/* ── Battle Engine Class ── */

export class BattleEngine {
  private state: BattleState;
  private consecutiveTimeouts: Map<string, number> = new Map();

  constructor(
    battleId: string,
    roomId: string,
    type: BattleType,
    players: { userId: string; name: string; eloRating: number }[],
    questions: BattleQuestionRuntime[],
    config: BattleConfig
  ) {
    const playerMap = new Map<string, BattlePlayerState>();
    for (const p of players) {
      playerMap.set(p.userId, {
        userId: p.userId,
        name: p.name,
        eloRatingBefore: p.eloRating,
        score: 0,
        answeredQuestions: new Set(),
        connected: false,
        forfeited: false,
        disconnectTimer: null,
        answers: [],
      });
      this.consecutiveTimeouts.set(p.userId, 0);
    }

    this.state = {
      battleId,
      roomId,
      type,
      status: 'waiting',
      players: playerMap,
      questions,
      config,
      currentQuestionIndex: 0,
      questionTimer: null,
      timerSyncInterval: null,
      startedAt: null,
    };

    activeBattles.set(roomId, this);
    logger.info({ battleId, roomId, playerCount: players.length }, 'BattleEngine created');
  }

  /* ── Lifecycle ── */

  async start(): Promise<void> {
    this.state.status = 'in_progress';
    this.state.startedAt = Date.now();

    // Mark users as in-battle
    const playerIds = Array.from(this.state.players.keys());
    await UserModel.updateMany(
      { _id: { $in: playerIds } },
      { $set: { presenceStatus: 'in-battle', activeBattleId: this.state.roomId } }
    );

    // Persist initial state to Redis for crash recovery
    await this.persistToRedis();

    logger.info({ battleId: this.state.battleId }, 'Battle started');

    // Send first question after a brief countdown
    setTimeout(() => this.sendCurrentQuestion(), 3000);
  }

  /* ── Question Flow ── */

  private sendCurrentQuestion(): void {
    const idx = this.state.currentQuestionIndex;
    if (idx >= this.state.questions.length) {
      this.endBattle('completed');
      return;
    }

    const question = this.state.questions[idx];
    question.sentAt = Date.now();

    // Send question to both players (WITHOUT correct answer)
    const payload: QuestionSendPayload = {
      index: idx,
      questionText: question.questionText,
      options: question.options,
      timeLimit: question.timeLimit,
      serverTimestamp: Date.now(),
      totalQuestions: this.state.questions.length,
    };

    emitToBattle(this.state.roomId, 'question_send', payload);

    // Start question timer
    this.startQuestionTimer(question.timeLimit);

    logger.debug({ battleId: this.state.battleId, questionIndex: idx }, 'Question sent');
  }

  private startQuestionTimer(timeLimitSeconds: number): void {
    this.clearTimers();

    const timeoutMs = timeLimitSeconds * 1000;

    // Main timer: auto-advance when time runs out
    this.state.questionTimer = setTimeout(() => {
      this.handleQuestionTimeout();
    }, timeoutMs);

    // Sync timer: broadcast time remaining every 3 seconds
    this.state.timerSyncInterval = setInterval(() => {
      const question = this.state.questions[this.state.currentQuestionIndex];
      if (!question?.sentAt) return;

      const elapsed = Date.now() - question.sentAt;
      const remaining = Math.max(0, timeLimitSeconds - Math.floor(elapsed / 1000));

      const syncPayload: TimerSyncPayload = {
        remaining,
        serverTimestamp: Date.now(),
      };
      emitToBattle(this.state.roomId, 'timer_sync', syncPayload);
    }, 3000);
  }

  private clearTimers(): void {
    if (this.state.questionTimer) {
      clearTimeout(this.state.questionTimer);
      this.state.questionTimer = null;
    }
    if (this.state.timerSyncInterval) {
      clearInterval(this.state.timerSyncInterval);
      this.state.timerSyncInterval = null;
    }
  }

  /* ── Answer Handling ── */

  submitAnswer(
    userId: string,
    questionIndex: number,
    optionId: string,
    clientTimestamp: number
  ): { accepted: boolean; reason?: string } {
    const player = this.state.players.get(userId);
    if (!player) return { accepted: false, reason: 'player_not_found' };

    // Validate question index
    if (questionIndex !== this.state.currentQuestionIndex) {
      return { accepted: false, reason: 'wrong_question_index' };
    }

    // Check for double submission (answer locking)
    if (player.answeredQuestions.has(questionIndex)) {
      return { accepted: false, reason: 'already_answered' };
    }

    // Check battle is in progress
    if (this.state.status !== 'in_progress') {
      return { accepted: false, reason: 'battle_not_active' };
    }

    const question = this.state.questions[questionIndex];
    if (!question || !question.sentAt) {
      return { accepted: false, reason: 'question_not_sent' };
    }

    // Calculate response time (server-side, authoritative)
    const responseTimeMs = Date.now() - question.sentAt;

    // Check if answer is correct
    const isCorrect = optionId === question.correctAnswer;

    // Calculate points
    const points = this.calculatePoints(isCorrect, responseTimeMs, question.difficulty);

    // Record answer
    const answer: AnswerRecord = {
      questionIndex,
      selectedOption: optionId,
      isCorrect,
      responseTimeMs,
      submittedAt: new Date(),
    };

    player.answers.push(answer);
    player.answeredQuestions.add(questionIndex);
    player.score += points;

    // Reset consecutive timeout counter
    this.consecutiveTimeouts.set(userId, 0);

    logger.debug(
      { battleId: this.state.battleId, userId, questionIndex, isCorrect, points },
      'Answer submitted'
    );

    // Check if all players have answered
    if (this.allPlayersAnswered(questionIndex)) {
      // Clear timer early and advance
      this.clearTimers();
      setTimeout(() => this.advanceQuestion(), 1500); // brief pause for UX
    }

    return { accepted: true };
  }

  private allPlayersAnswered(questionIndex: number): boolean {
    for (const player of this.state.players.values()) {
      if (player.connected && !player.forfeited && !player.answeredQuestions.has(questionIndex)) {
        return false;
      }
    }
    return true;
  }

  /* ── Question Timeout ── */

  private handleQuestionTimeout(): void {
    const idx = this.state.currentQuestionIndex;
    const question = this.state.questions[idx];

    // Record timeout (null answer) for players who didn't answer
    for (const player of this.state.players.values()) {
      if (!player.answeredQuestions.has(idx) && player.connected && !player.forfeited) {
        const answer: AnswerRecord = {
          questionIndex: idx,
          selectedOption: null,
          isCorrect: false,
          responseTimeMs: (question?.timeLimit ?? 15) * 1000,
          submittedAt: new Date(),
        };
        player.answers.push(answer);
        player.answeredQuestions.add(idx);

        // Track consecutive timeouts for idle detection
        const timeouts = (this.consecutiveTimeouts.get(player.userId) ?? 0) + 1;
        this.consecutiveTimeouts.set(player.userId, timeouts);

        if (timeouts >= SCORE_CONFIG.IDLE_FORFEIT_THRESHOLD) {
          logger.warn(
            { battleId: this.state.battleId, userId: player.userId, timeouts },
            'Player idle — auto-forfeit'
          );
          player.forfeited = true;
        }
      }
    }

    // Check if both players are forfeited → abandon
    const allForfeited = Array.from(this.state.players.values()).every((p) => p.forfeited);
    if (allForfeited) {
      this.endBattle('abandoned');
      return;
    }

    // Check if only one forfeited
    const forfeited = Array.from(this.state.players.values()).find((p) => p.forfeited);
    if (forfeited) {
      this.endBattle('forfeited');
      return;
    }

    this.advanceQuestion();
  }

  /* ── Advance to Next Question ── */

  private advanceQuestion(): void {
    const idx = this.state.currentQuestionIndex;
    const question = this.state.questions[idx];

    // Broadcast score update with correct answer
    const scores = Array.from(this.state.players.values()).map((p) => ({
      userId: p.userId,
      name: p.name,
      score: p.score,
    }));

    // Send personalized score updates
    for (const player of this.state.players.values()) {
      const lastAnswer = player.answers.find((a) => a.questionIndex === idx);
      const payload: ScoreUpdatePayload = {
        scores,
        questionIndex: idx,
        correctAnswer: question.correctAnswer,
        explanation: undefined,
        yourResult: {
          isCorrect: lastAnswer?.isCorrect ?? false,
          pointsEarned: lastAnswer?.isCorrect
            ? this.calculatePoints(true, lastAnswer.responseTimeMs, question.difficulty)
            : 0,
          responseTimeMs: lastAnswer?.responseTimeMs ?? 0,
        },
      };
      emitToBattle(this.state.roomId, 'score_update', payload);
    }

    // Move to next question
    this.state.currentQuestionIndex += 1;

    if (this.state.currentQuestionIndex >= this.state.questions.length) {
      // All questions done
      setTimeout(() => this.endBattle('completed'), 2000);
    } else {
      // Send next question after a brief pause
      setTimeout(() => this.sendCurrentQuestion(), 3000);
    }

    // Persist state for recovery
    this.persistToRedis().catch((err) => {
      logger.error({ err, battleId: this.state.battleId }, 'Failed to persist battle state');
    });
  }

  /* ── End Battle ── */

  async endBattle(reason: 'completed' | 'forfeit' | 'timeout' | 'abandoned' | 'forfeited'): Promise<void> {
    this.clearTimers();

    if (this.state.status === 'completed' || this.state.status === 'abandoned') {
      return; // Already ended
    }

    this.state.status = reason === 'abandoned' ? 'abandoned' : reason === 'forfeited' ? 'forfeited' : 'completed';
    const endedAt = Date.now();
    const duration = this.state.startedAt ? Math.floor((endedAt - this.state.startedAt) / 1000) : 0;

    const players = Array.from(this.state.players.values());

    // Determine winner
    let winnerId: string | null = null;
    let isDraw = false;

    if (reason === 'abandoned') {
      isDraw = false;
      winnerId = null;
    } else if (reason === 'forfeited') {
      const forfeitedPlayer = players.find((p) => p.forfeited);
      winnerId = players.find((p) => !p.forfeited)?.userId ?? null;
    } else {
      const sorted = [...players].sort((a, b) => b.score - a.score);
      if (sorted.length === 2 && sorted[0].score === sorted[1].score) {
        isDraw = true;
      } else {
        winnerId = sorted[0]?.userId ?? null;
      }
    }

    // Calculate ELO changes (skip for abandoned battles)
    const eloChanges = new Map<string, { change: number; newRating: number }>();
    if (reason !== 'abandoned' && players.length === 2) {
      const p1 = players[0];
      const p2 = players[1];
      const result1 = isDraw ? 0.5 : winnerId === p1.userId ? 1 : 0;
      const eloFactor = reason === 'forfeited' ? SCORE_CONFIG.FORFEIT_ELO_FACTOR : 1;

      const changes = await calculateEloChanges(
        p1.userId,
        p1.eloRatingBefore,
        p2.userId,
        p2.eloRatingBefore,
        result1,
        this.state.battleId,
        eloFactor,
        this.state.type
      );

      eloChanges.set(p1.userId, changes.player1);
      eloChanges.set(p2.userId, changes.player2);
    }

    // Calculate XP earnings
    const xpAwarded = new Map<string, number>();
    for (const player of players) {
      let xp = 0;
      if (reason !== 'abandoned') {
        xp += Math.floor(player.score / 10); // Base XP from score
        if (winnerId === player.userId) xp += 50; // Win bonus
        if (isDraw) xp += 25; // Draw bonus
        xp += player.answers.filter((a) => a.isCorrect).length * 5; // Per correct answer
      }
      xpAwarded.set(player.userId, xp);
    }

    // Save to MongoDB
    try {
      const battleDoc = await this.persistToMongoDB(
        winnerId,
        isDraw,
        eloChanges,
        xpAwarded,
        endedAt,
        duration
      );

      // Update user stats
      await this.updateUserStats(winnerId, isDraw, eloChanges, xpAwarded, reason);

      // Update learning profiles
      if (reason !== 'abandoned') {
        for (const player of players) {
          await updateLearningProfile(player.userId, player.answers, this.state.questions).catch(
            (err) => logger.error({ err, userId: player.userId }, 'Failed to update learning profile')
          );
        }
      }

      // Update question usage stats
      await updateQuestionStats(this.state.questions, players).catch((err) =>
        logger.error({ err }, 'Failed to update question stats')
      );
    } catch (err) {
      logger.error({ err, battleId: this.state.battleId }, 'Failed to persist battle results');
    }

    // Send battle_end to each player (personalized)
    for (const player of players) {
      const elo = eloChanges.get(player.userId);
      const analytics = this.computeAnalytics(player);
      const result = isDraw ? 'draw' : winnerId === player.userId ? 'win' : 'loss';

      const payload: BattleEndPayload = {
        battleId: this.state.battleId,
        result,
        finalScores: players.map((p) => ({
          userId: p.userId,
          name: p.name,
          score: p.score,
          accuracy: p.answers.length > 0
            ? Math.round((p.answers.filter((a) => a.isCorrect).length / p.answers.length) * 100)
            : 0,
        })),
        eloChange: elo?.change ?? 0,
        newRating: elo?.newRating ?? player.eloRatingBefore,
        xpEarned: xpAwarded.get(player.userId) ?? 0,
        analytics,
      };

      // Emit to specific user
      const { getIO } = require('../../config/socket');
      getIO().to(`user:${player.userId}`).emit('battle_end', payload);
    }

    // Cleanup
    await this.dispose();

    logger.info(
      { battleId: this.state.battleId, reason, winnerId, isDraw },
      'Battle ended'
    );
  }

  /* ── Analytics ── */

  private computeAnalytics(player: BattlePlayerState): PostMatchAnalytics {
    const answers = player.answers;
    const correctAnswers = answers.filter((a) => a.isCorrect);
    const responseTimes = answers.filter((a) => a.selectedOption !== null).map((a) => a.responseTimeMs);

    // Topic breakdown
    const topicMap = new Map<string, { correct: number; total: number }>();
    for (let i = 0; i < answers.length; i++) {
      const question = this.state.questions[i];
      if (!question) continue;
      const existing = topicMap.get(question.topic) || { correct: 0, total: 0 };
      existing.total += 1;
      if (answers[i]?.isCorrect) existing.correct += 1;
      topicMap.set(question.topic, existing);
    }

    const topicBreakdown = Array.from(topicMap.entries()).map(([topic, stats]) => ({
      topic,
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    }));

    return {
      accuracy: answers.length > 0
        ? Math.round((correctAnswers.length / answers.length) * 100)
        : 0,
      avgResponseTimeMs: responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0,
      fastestResponseMs: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      slowestResponseMs: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      topicBreakdown,
      strongTopics: topicBreakdown.filter((t) => t.accuracy >= 80).map((t) => t.topic),
      weakTopics: topicBreakdown.filter((t) => t.accuracy < 50).map((t) => t.topic),
    };
  }

  /* ── Persistence ── */

  private async persistToMongoDB(
    winnerId: string | null,
    isDraw: boolean,
    eloChanges: Map<string, { change: number; newRating: number }>,
    xpAwarded: Map<string, number>,
    endedAt: number,
    duration: number
  ): Promise<IBattle> {
    const players = Array.from(this.state.players.values()).map((p) => {
      const elo = eloChanges.get(p.userId);
      const correctCount = p.answers.filter((a) => a.isCorrect).length;
      const responseTimes = p.answers.filter((a) => a.selectedOption !== null).map((a) => a.responseTimeMs);

      return {
        userId: p.userId,
        name: p.name,
        eloRatingBefore: p.eloRatingBefore,
        eloRatingAfter: elo?.newRating ?? p.eloRatingBefore,
        score: p.score,
        answers: p.answers.map((a) => ({
          questionIndex: a.questionIndex,
          selectedOption: a.selectedOption,
          isCorrect: a.isCorrect,
          responseTimeMs: a.responseTimeMs,
          submittedAt: a.submittedAt,
        })),
        accuracy: p.answers.length > 0 ? Math.round((correctCount / p.answers.length) * 100) : 0,
        avgResponseTimeMs:
          responseTimes.length > 0
            ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
            : 0,
        connected: p.connected,
        forfeited: p.forfeited,
      };
    });

    const questions = this.state.questions.map((q) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      topic: q.topic,
      difficulty: q.difficulty,
      timeLimit: q.timeLimit,
    }));

    return BattleModel.findOneAndUpdate(
      { roomId: this.state.roomId },
      {
        $set: {
          status: this.state.status,
          players,
          questions,
          config: this.state.config,
          currentQuestionIndex: this.state.currentQuestionIndex,
          winnerId: winnerId || null,
          isDraw,
          xpAwarded: Object.fromEntries(xpAwarded),
          startedAt: this.state.startedAt ? new Date(this.state.startedAt) : null,
          endedAt: new Date(endedAt),
          duration,
        },
      },
      { upsert: true, new: true }
    );
  }

  private async updateUserStats(
    winnerId: string | null,
    isDraw: boolean,
    eloChanges: Map<string, { change: number; newRating: number }>,
    xpAwarded: Map<string, number>,
    reason: string
  ): Promise<void> {
    for (const player of this.state.players.values()) {
      const elo = eloChanges.get(player.userId);
      const xp = xpAwarded.get(player.userId) ?? 0;
      const isWinner = winnerId === player.userId;

      const update: Record<string, unknown> = {
        presenceStatus: 'online',
        activeBattleId: null,
      };

      if (elo) {
        update.eloRating = Math.max(SCORE_CONFIG.MIN_RATING, elo.newRating);
      }

      const inc: Record<string, number> = {
        'battleStats.totalBattles': 1,
        xp,
        'battleStats.totalXpEarned': xp,
      };

      if (reason !== 'abandoned') {
        if (isDraw) {
          inc['battleStats.draws'] = 1;
          update['battleStats.winStreak'] = 0;
        } else if (isWinner) {
          inc['battleStats.wins'] = 1;
          inc['battleStats.winStreak'] = 1;
        } else {
          inc['battleStats.losses'] = 1;
          update['battleStats.winStreak'] = 0;
        }
      }

      await UserModel.findByIdAndUpdate(player.userId, {
        $set: update,
        $inc: inc,
      });

      // Update best win streak
      if (isWinner) {
        const user = await UserModel.findById(player.userId).select('battleStats.winStreak battleStats.bestWinStreak level');
        if (user && user.battleStats.winStreak > user.battleStats.bestWinStreak) {
          await UserModel.findByIdAndUpdate(player.userId, {
            $set: { 'battleStats.bestWinStreak': user.battleStats.winStreak },
          });
        }
        // Recalculate level
        if (user) {
          const { calculateLevel } = require('../../utils/gamification');
          const newLevel = calculateLevel(user.xp + xp);
          if (newLevel !== user.level) {
            await UserModel.findByIdAndUpdate(player.userId, { $set: { level: newLevel } });
          }
        }
      }
    }
  }

  async persistToRedis(): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = `battle:state:${this.state.roomId}`;
      const serialized = {
        battleId: this.state.battleId,
        roomId: this.state.roomId,
        type: this.state.type,
        status: this.state.status,
        currentQuestionIndex: this.state.currentQuestionIndex,
        startedAt: this.state.startedAt,
        players: JSON.stringify(
          Array.from(this.state.players.entries()).map(([id, p]) => ({
            ...p,
            answeredQuestions: Array.from(p.answeredQuestions),
            disconnectTimer: null,
          }))
        ),
      };
      await redis.hmset(key, serialized);
      await redis.expire(key, 3600); // 1 hour TTL
    } catch (err) {
      logger.error({ err }, 'Failed to persist battle state to Redis');
    }
  }

  /* ── Disconnect / Reconnect ── */

  handleDisconnect(userId: string): void {
    const player = this.state.players.get(userId);
    if (!player) return;

    player.connected = false;

    // Notify opponent
    for (const [id, p] of this.state.players) {
      if (id !== userId && p.connected) {
        const { getIO } = require('../../config/socket');
        getIO().to(`user:${id}`).emit('opponent_disconnect', {
          gracePeriodSeconds: SCORE_CONFIG.DISCONNECT_GRACE_PERIOD,
        });
      }
    }

    // Start grace period timer
    player.disconnectTimer = setTimeout(() => {
      logger.warn({ battleId: this.state.battleId, userId }, 'Disconnect grace period expired — forfeit');
      player.forfeited = true;
      this.endBattle('forfeited');
    }, SCORE_CONFIG.DISCONNECT_GRACE_PERIOD * 1000);

    logger.info({ battleId: this.state.battleId, userId }, 'Player disconnected — grace period started');
  }

  handleReconnect(userId: string): void {
    const player = this.state.players.get(userId);
    if (!player) return;

    player.connected = true;

    // Clear grace period timer
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }

    // Notify opponent
    for (const [id, p] of this.state.players) {
      if (id !== userId && p.connected) {
        const { getIO } = require('../../config/socket');
        getIO().to(`user:${id}`).emit('opponent_reconnect', {});
      }
    }

    // Send full state sync to reconnected player
    this.sendStateSync(userId);

    logger.info({ battleId: this.state.battleId, userId }, 'Player reconnected');
  }

  private sendStateSync(userId: string): void {
    const player = this.state.players.get(userId);
    if (!player) return;

    const currentQuestion = this.state.questions[this.state.currentQuestionIndex];
    const elapsed = currentQuestion?.sentAt ? Date.now() - currentQuestion.sentAt : 0;
    const remaining = Math.max(0, (currentQuestion?.timeLimit ?? 15) - Math.floor(elapsed / 1000));

    const scores = Array.from(this.state.players.values()).map((p) => ({
      userId: p.userId,
      name: p.name,
      score: p.score,
    }));

    const { getIO } = require('../../config/socket');
    getIO().to(`user:${userId}`).emit('battle_state_sync', {
      battleId: this.state.battleId,
      roomId: this.state.roomId,
      status: this.state.status,
      currentQuestionIndex: this.state.currentQuestionIndex,
      scores,
      timeRemaining: remaining,
      serverTimestamp: Date.now(),
      currentQuestion: currentQuestion
        ? {
            index: this.state.currentQuestionIndex,
            questionText: currentQuestion.questionText,
            options: currentQuestion.options,
            timeLimit: currentQuestion.timeLimit,
            alreadyAnswered: player.answeredQuestions.has(this.state.currentQuestionIndex),
          }
        : null,
    });
  }

  /* ── Forfeit ── */

  async handleForfeit(userId: string): Promise<void> {
    const player = this.state.players.get(userId);
    if (!player) return;

    player.forfeited = true;
    await this.endBattle('forfeited');
  }

  /* ── Getters ── */

  getState(): BattleState {
    return this.state;
  }

  getPlayerScore(userId: string): number {
    return this.state.players.get(userId)?.score ?? 0;
  }

  isQuestionAnswered(userId: string, questionIndex: number): boolean {
    return this.state.players.get(userId)?.answeredQuestions.has(questionIndex) ?? false;
  }

  getRoomId(): string {
    return this.state.roomId;
  }

  getBattleId(): string {
    return this.state.battleId;
  }

  /* ── Score Calculation ── */

  private calculatePoints(isCorrect: boolean, responseTimeMs: number, difficulty: string): number {
    if (!isCorrect) return 0;

    const base = SCORE_CONFIG.BASE_POINTS[difficulty] ?? 100;
    const timeRatio = Math.max(0, 1 - responseTimeMs / SCORE_CONFIG.MAX_TIME_MS);
    const timeBonus = Math.floor(base * SCORE_CONFIG.TIME_BONUS_FACTOR * timeRatio);

    return base + timeBonus;
  }

  /* ── Cleanup ── */

  async dispose(): Promise<void> {
    this.clearTimers();

    // Clear disconnect timers
    for (const player of this.state.players.values()) {
      if (player.disconnectTimer) {
        clearTimeout(player.disconnectTimer);
        player.disconnectTimer = null;
      }
    }

    // Remove from active battles
    activeBattles.delete(this.state.roomId);

    // Clean up Redis state
    try {
      const redis = getRedisClient();
      await redis.del(`battle:state:${this.state.roomId}`);
    } catch {
      // ignore cleanup errors
    }

    logger.debug({ battleId: this.state.battleId }, 'BattleEngine disposed');
  }
}
