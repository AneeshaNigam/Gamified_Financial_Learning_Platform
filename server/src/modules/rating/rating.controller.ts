import { Request, Response } from 'express';

import asyncHandler from '../../utils/asyncHandler';
import sendSuccess from '../../utils/response';
import ApiError from '../../utils/ApiError';
import { getUserRatingHistory } from './rating.service';

/* ── Rating History ── */

export const getRatingHistoryController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');

  const limit = Math.min(parseInt((req.query.limit as string) ?? '30', 10), 100);
  const data = await getUserRatingHistory(req.user.id, limit);

  return sendSuccess(res, data);
});
