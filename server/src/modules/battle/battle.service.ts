import { BattleModel } from '../../models/Battle';
import { UserModel } from '../../models/User';
import { RatingHistoryModel } from '../../models/RatingHistory';
import logger from '../../utils/logger';

/* ── Battle History ── */

export async function getUserBattleHistory(
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<{
  battles: any[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const skip = (page - 1) * limit;

  const [battles, total] = await Promise.all([
    BattleModel.find({
      'players.userId': userId,
      status: { $in: ['completed', 'forfeited'] },
    })
      .sort({ endedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BattleModel.countDocuments({
      'players.userId': userId,
      status: { $in: ['completed', 'forfeited'] },
    }),
  ]);

  const formatted = battles.map((battle) => {
    const player = battle.players.find((p: any) => p.userId.toString() === userId);
    const opponent = battle.players.find((p: any) => p.userId.toString() !== userId);
    const isWinner = battle.winnerId?.toString() === userId;

    return {
      battleId: battle.roomId,
      type: battle.type,
      result: battle.isDraw ? 'draw' : isWinner ? 'win' : 'loss',
      score: player?.score ?? 0,
      opponentScore: opponent?.score ?? 0,
      opponentName: opponent?.name ?? 'Unknown',
      accuracy: player?.accuracy ?? 0,
      eloChange: (player?.eloRatingAfter ?? 0) - (player?.eloRatingBefore ?? 0),
      questionsAnswered: player?.answers?.length ?? 0,
      duration: battle.duration,
      date: battle.endedAt,
    };
  });

  return {
    battles: formatted,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/* ── Battle Detail ── */

export async function getBattleDetail(battleId: string, userId: string): Promise<any> {
  const battle = await BattleModel.findOne({ roomId: battleId }).lean();
  if (!battle) return null;

  const player = battle.players.find((p) => p.userId.toString() === userId);
  const opponent = battle.players.find((p) => p.userId.toString() !== userId);

  if (!player) return null;

  // Build question-by-question breakdown
  const questionDetails = battle.questions.map((q, idx) => {
    const playerAnswer = player.answers.find((a) => a.questionIndex === idx);
    return {
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      topic: q.topic,
      difficulty: q.difficulty,
      yourAnswer: playerAnswer?.selectedOption ?? null,
      isCorrect: playerAnswer?.isCorrect ?? false,
      responseTimeMs: playerAnswer?.responseTimeMs ?? 0,
    };
  });

  return {
    battleId: battle.roomId,
    type: battle.type,
    status: battle.status,
    result: battle.isDraw ? 'draw' : battle.winnerId?.toString() === userId ? 'win' : 'loss',
    player: {
      name: player.name,
      score: player.score,
      accuracy: player.accuracy,
      avgResponseTimeMs: player.avgResponseTimeMs,
      eloRatingBefore: player.eloRatingBefore,
      eloRatingAfter: player.eloRatingAfter,
      eloChange: player.eloRatingAfter - player.eloRatingBefore,
    },
    opponent: opponent ? {
      name: opponent.name,
      score: opponent.score,
      accuracy: opponent.accuracy,
    } : null,
    questionDetails,
    duration: battle.duration,
    date: battle.endedAt,
  };
}

/* ── User Analytics ── */

export async function getUserBattleAnalytics(userId: string): Promise<any> {
  const user = await UserModel.findById(userId)
    .select('battleStats eloRating learningProfile')
    .lean();

  if (!user) return null;

  const stats = user.battleStats || {
    totalBattles: 0, wins: 0, losses: 0, draws: 0,
    winStreak: 0, bestWinStreak: 0, totalXpEarned: 0,
  };

  // Recent form (last 5 battles)
  const recentBattles = await BattleModel.find({
    'players.userId': userId,
    status: { $in: ['completed', 'forfeited'] },
  })
    .sort({ endedAt: -1 })
    .limit(5)
    .lean();

  const recentForm = recentBattles.map((b) => {
    if (b.isDraw) return 'D';
    return b.winnerId?.toString() === userId ? 'W' : 'L';
  });

  // Aggregate accuracy and response times from recent battles
  const recentPlayerData = recentBattles
    .map((b) => b.players.find((p) => p.userId.toString() === userId))
    .filter(Boolean);

  const avgAccuracy = recentPlayerData.length > 0
    ? Math.round(recentPlayerData.reduce((sum, p: any) => sum + (p.accuracy ?? 0), 0) / recentPlayerData.length)
    : 0;

  const avgResponseTimeMs = recentPlayerData.length > 0
    ? Math.round(recentPlayerData.reduce((sum, p: any) => sum + (p.avgResponseTimeMs ?? 0), 0) / recentPlayerData.length)
    : 0;

  // Rating history (last 30 data points)
  const ratingHistory = await RatingHistoryModel.find({ userId })
    .sort({ timestamp: -1 })
    .limit(30)
    .lean();

  // Topic breakdown from learning profile
  const topicAccuracy = user.learningProfile?.topicAccuracy as Record<string, any> || {};
  const topicBreakdown = Object.entries(topicAccuracy).map(([topic, stats]: [string, any]) => ({
    topic,
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    total: stats.total,
    avgResponseTimeMs: Math.round(stats.avgResponseTimeMs || 0),
  })).sort((a, b) => b.accuracy - a.accuracy);

  const bestTopic = topicBreakdown[0] || null;
  const worstTopic = topicBreakdown[topicBreakdown.length - 1] || null;

  return {
    totalBattles: stats.totalBattles,
    wins: stats.wins,
    losses: stats.losses,
    draws: stats.draws,
    winRate: stats.totalBattles > 0
      ? Math.round((stats.wins / stats.totalBattles) * 1000) / 10
      : 0,
    winStreak: stats.winStreak,
    bestWinStreak: stats.bestWinStreak,
    eloRating: user.eloRating ?? 1200,
    averageAccuracy: avgAccuracy,
    averageResponseTimeMs: avgResponseTimeMs,
    bestTopic,
    worstTopic,
    topicBreakdown,
    recentForm,
    ratingHistory: ratingHistory.reverse().map((r) => ({
      date: r.timestamp,
      rating: r.ratingAfter,
      change: r.ratingChange,
      result: r.result,
    })),
    totalXpEarned: stats.totalXpEarned,
  };
}

/* ── Battle Leaderboard ── */

export async function getBattleLeaderboard(limit: number = 20): Promise<any[]> {
  const users = await UserModel.find({
    'battleStats.totalBattles': { $gte: 5 },
  })
    .sort({ eloRating: -1 })
    .limit(limit)
    .select('name level eloRating battleStats avatar')
    .lean();

  return users.map((user, index) => ({
    rank: index + 1,
    name: user.name,
    level: user.level,
    eloRating: user.eloRating ?? 1200,
    wins: user.battleStats?.wins ?? 0,
    losses: user.battleStats?.losses ?? 0,
    winRate: user.battleStats?.totalBattles
      ? Math.round(((user.battleStats.wins ?? 0) / user.battleStats.totalBattles) * 100)
      : 0,
    avatar: user.avatar,
  }));
}
