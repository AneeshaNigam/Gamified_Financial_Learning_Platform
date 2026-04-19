import { Request, Response } from 'express';

import asyncHandler from '../../utils/asyncHandler';
import sendSuccess from '../../utils/response';
import ApiError from '../../utils/ApiError';
import { createRoom, joinRoom } from './room.service';

/* ── Create Room ── */

export const createRoomController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');

  const { config, topics } = req.body || {};

  const result = await createRoom(req.user.id, req.user.name, {
    totalQuestions: config?.totalQuestions,
    timePerQuestion: config?.timePerQuestion,
    topics,
  });

  return sendSuccess(res, result, 'Room created', 201);
});

/* ── Join Room ── */

export const joinRoomController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');

  const { code } = req.body;
  if (!code) throw new ApiError(400, 'Room code is required');

  const { room } = await joinRoom(req.user.id, req.user.name, code);

  return sendSuccess(res, {
    roomId: room.id,
    code: room.code,
    status: room.status,
    players: room.players.map((p) => ({
      userId: p.userId.toString(),
      name: p.name,
      isReady: p.isReady,
    })),
  }, 'Joined room');
});
