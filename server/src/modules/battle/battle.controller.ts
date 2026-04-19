import { Request, Response } from 'express';

import asyncHandler from '../../utils/asyncHandler';
import sendSuccess from '../../utils/response';
import ApiError from '../../utils/ApiError';
import {
  getUserBattleHistory,
  getBattleDetail,
  getUserBattleAnalytics,
  getBattleLeaderboard,
} from './battle.service';

/* ── Battle History ── */

export const getBattleHistoryController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');

  const page = parseInt((req.query.page as string) ?? '1', 10);
  const limit = Math.min(parseInt((req.query.limit as string) ?? '10', 10), 50);

  const data = await getUserBattleHistory(req.user.id, page, limit);
  return sendSuccess(res, data);
});

/* ── Single Battle Detail ── */

export const getBattleDetailController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');

  const { battleId } = req.params;
  if (!battleId) throw new ApiError(400, 'Battle ID required');

  const data = await getBattleDetail(battleId, req.user.id);
  if (!data) throw new ApiError(404, 'Battle not found');

  return sendSuccess(res, data);
});

/* ── User Analytics ── */

export const getBattleAnalyticsController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');

  const data = await getUserBattleAnalytics(req.user.id);
  if (!data) throw new ApiError(404, 'Analytics not available');

  return sendSuccess(res, data);
});

/* ── Battle Leaderboard ── */

export const getBattleLeaderboardController = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? '20', 10), 50);
  const data = await getBattleLeaderboard(limit);
  return sendSuccess(res, data);
});
