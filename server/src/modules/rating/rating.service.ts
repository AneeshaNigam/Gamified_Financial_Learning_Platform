import { UserModel } from '../../models/User';
import { RatingHistoryModel } from '../../models/RatingHistory';
import { SCORE_CONFIG } from '../battle/battle.types';
import logger from '../../utils/logger';

/* ── ELO Calculation ── */

/**
 * Standard ELO rating formula.
 * @param playerRating - Current rating of the player
 * @param opponentRating - Current rating of the opponent
 * @param result - 1 = win, 0.5 = draw, 0 = loss
 * @param kFactor - Volatility factor
 * @returns The change in rating (can be negative)
 */
function calculateEloChange(
  playerRating: number,
  opponentRating: number,
  result: number,
  kFactor: number
): number {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  return Math.round(kFactor * (result - expectedScore));
}

/**
 * Determine K-factor based on player's experience and current rating.
 * - New players (< 30 battles): K=40 (volatile, helps calibrate quickly)
 * - Top players (≥ 2400 rating): K=16 (stable)
 * - Standard: K=32
 */
function getKFactor(totalBattles: number, currentRating: number): number {
  if (totalBattles < 30) return 40;
  if (currentRating >= 2400) return 16;
  return 32;
}

/* ── Full ELO Update for Both Players ── */

export async function calculateEloChanges(
  player1Id: string,
  player1Rating: number,
  player2Id: string,
  player2Rating: number,
  player1Result: number, // 1 = win, 0.5 = draw, 0 = loss
  battleId: string,
  eloFactor: number = 1 // reduction factor for forfeits
): Promise<{
  player1: { change: number; newRating: number };
  player2: { change: number; newRating: number };
}> {
  // Get battle counts for K-factor determination
  const [user1, user2] = await Promise.all([
    UserModel.findById(player1Id).select('battleStats.totalBattles'),
    UserModel.findById(player2Id).select('battleStats.totalBattles'),
  ]);

  const k1 = getKFactor(user1?.battleStats?.totalBattles ?? 0, player1Rating);
  const k2 = getKFactor(user2?.battleStats?.totalBattles ?? 0, player2Rating);

  let change1 = calculateEloChange(player1Rating, player2Rating, player1Result, k1);
  let change2 = calculateEloChange(player2Rating, player1Rating, 1 - player1Result, k2);

  // Apply factor (e.g., reduced ELO change on forfeit)
  change1 = Math.round(change1 * eloFactor);
  change2 = Math.round(change2 * eloFactor);

  // Apply floor
  const newRating1 = Math.max(SCORE_CONFIG.MIN_RATING, player1Rating + change1);
  const newRating2 = Math.max(SCORE_CONFIG.MIN_RATING, player2Rating + change2);

  // Persist rating history
  const result1 = player1Result === 1 ? 'win' : player1Result === 0.5 ? 'draw' : 'loss';
  const result2 = player1Result === 0 ? 'win' : player1Result === 0.5 ? 'draw' : 'loss';

  try {
    await RatingHistoryModel.insertMany([
      {
        userId: player1Id,
        battleId,
        ratingBefore: player1Rating,
        ratingAfter: newRating1,
        ratingChange: change1,
        opponentRating: player2Rating,
        opponentId: player2Id,
        result: result1,
        timestamp: new Date(),
      },
      {
        userId: player2Id,
        battleId,
        ratingBefore: player2Rating,
        ratingAfter: newRating2,
        ratingChange: change2,
        opponentRating: player1Rating,
        opponentId: player1Id,
        result: result2,
        timestamp: new Date(),
      },
    ]);

    // Update user ratings in DB
    await Promise.all([
      UserModel.findByIdAndUpdate(player1Id, { eloRating: newRating1 }),
      UserModel.findByIdAndUpdate(player2Id, { eloRating: newRating2 }),
    ]);
  } catch (err) {
    logger.error({ err, battleId }, 'Failed to persist ELO changes');
  }

  logger.info(
    {
      battleId,
      p1: { id: player1Id, change: change1, newRating: newRating1 },
      p2: { id: player2Id, change: change2, newRating: newRating2 },
    },
    'ELO ratings updated'
  );

  return {
    player1: { change: change1, newRating: newRating1 },
    player2: { change: change2, newRating: newRating2 },
  };
}

/* ── Get Rating History ── */

export async function getUserRatingHistory(
  userId: string,
  limit: number = 30
): Promise<{ date: Date; rating: number; change: number; result: string }[]> {
  const history = await RatingHistoryModel.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

  return history.map((h) => ({
    date: h.timestamp,
    rating: h.ratingAfter,
    change: h.ratingChange,
    result: h.result,
  }));
}
