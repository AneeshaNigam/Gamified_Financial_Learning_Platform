import crypto from 'crypto';
import { Types } from 'mongoose';

import { BattleRoomModel, IBattleRoom } from '../../models/BattleRoom';
import { BattleModel } from '../../models/Battle';
import { UserModel } from '../../models/User';
import { BattleEngine } from '../battle/battle.engine';
import { selectAdaptiveQuestions } from '../adaptive/adaptive.service';
import { BattleQuestionRuntime } from '../battle/battle.types';
import { emitToUser } from '../../config/socket';
import logger from '../../utils/logger';
import ApiError from '../../utils/ApiError';

/* ── Room Code Generation ── */

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes I,O,0,1

function generateRoomCode(): string {
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[bytes[i] % ROOM_CODE_CHARS.length];
  }
  return code;
}

/* ── Create Room ── */

export async function createRoom(
  userId: string,
  userName: string,
  config?: { totalQuestions?: number; timePerQuestion?: number; topics?: string[] }
): Promise<{ code: string; roomId: string }> {
  // Check if user already has an active room
  const existingRoom = await BattleRoomModel.findOne({
    createdBy: userId,
    status: { $in: ['waiting', 'ready'] },
  });

  if (existingRoom) {
    throw new ApiError(400, 'You already have an active room. Close it before creating a new one.');
  }

  // Check if user is in battle
  const user = await UserModel.findById(userId).select('activeBattleId');
  if (user?.activeBattleId) {
    throw new ApiError(400, 'Cannot create room while in a battle');
  }

  // Generate unique code (retry on collision)
  let code = '';
  let attempts = 0;
  while (attempts < 10) {
    code = generateRoomCode();
    const exists = await BattleRoomModel.findOne({ code });
    if (!exists) break;
    attempts++;
  }

  if (attempts >= 10) {
    throw new ApiError(500, 'Failed to generate unique room code');
  }

  const room = await BattleRoomModel.create({
    code,
    createdBy: userId,
    status: 'waiting',
    players: [
      {
        userId: new Types.ObjectId(userId),
        name: userName,
        isReady: false,
        joinedAt: new Date(),
      },
    ],
    config: {
      totalQuestions: config?.totalQuestions ?? 10,
      timePerQuestion: config?.timePerQuestion ?? 15,
      topics: config?.topics ?? [],
    },
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });

  logger.info({ code, roomId: room.id, userId }, 'Private room created');

  return { code, roomId: room.id };
}

/* ── Join Room ── */

export async function joinRoom(
  userId: string,
  userName: string,
  code: string
): Promise<{ room: IBattleRoom }> {
  const room = await BattleRoomModel.findOne({ code: code.toUpperCase(), status: 'waiting' });

  if (!room) {
    throw new ApiError(404, 'Room not found or has expired');
  }

  // Check if user is already in this room
  if (room.players.some((p) => p.userId.toString() === userId)) {
    throw new ApiError(400, 'You are already in this room');
  }

  // Check if room is full
  if (room.players.length >= 2) {
    throw new ApiError(400, 'Room is full');
  }

  // Check if user is in battle
  const user = await UserModel.findById(userId).select('activeBattleId');
  if (user?.activeBattleId) {
    throw new ApiError(400, 'Cannot join room while in a battle');
  }

  room.players.push({
    userId: new Types.ObjectId(userId),
    name: userName,
    isReady: false,
    joinedAt: new Date(),
  } as any);

  room.status = 'ready';
  await room.save();

  // Notify room creator
  const creatorId = room.createdBy.toString();
  emitToUser(creatorId, 'room_update', {
    roomId: room.id,
    code: room.code,
    status: room.status,
    players: room.players.map((p) => ({
      userId: p.userId.toString(),
      name: p.name,
      isReady: p.isReady,
    })),
  });

  logger.info({ code, roomId: room.id, userId }, 'Player joined room');

  return { room };
}

/* ── Player Ready ── */

export async function setPlayerReady(
  userId: string,
  roomId: string
): Promise<{ allReady: boolean; room: IBattleRoom }> {
  const room = await BattleRoomModel.findById(roomId);
  if (!room) throw new ApiError(404, 'Room not found');

  const player = room.players.find((p) => p.userId.toString() === userId);
  if (!player) throw new ApiError(403, 'You are not in this room');

  player.isReady = true;
  await room.save();

  // Broadcast update
  for (const p of room.players) {
    emitToUser(p.userId.toString(), 'room_update', {
      roomId: room.id,
      code: room.code,
      status: room.status,
      players: room.players.map((pl) => ({
        userId: pl.userId.toString(),
        name: pl.name,
        isReady: pl.isReady,
      })),
    });
  }

  const allReady = room.players.length === 2 && room.players.every((p) => p.isReady);

  if (allReady) {
    // Start the battle
    await startBattleFromRoom(room);
  }

  return { allReady, room };
}

/* ── Start Battle from Room ── */

async function startBattleFromRoom(room: IBattleRoom): Promise<void> {
  const roomId = crypto.randomBytes(12).toString('hex');
  const battleId = crypto.randomBytes(12).toString('hex');

  const p1 = room.players[0];
  const p2 = room.players[1];

  const [user1, user2] = await Promise.all([
    UserModel.findById(p1.userId).select('eloRating level'),
    UserModel.findById(p2.userId).select('eloRating level'),
  ]);

  if (!user1 || !user2) {
    logger.error({ roomId: room.id }, 'Could not find users for room battle');
    return;
  }

  try {
    const questions = await selectAdaptiveQuestions(
      p1.userId.toString(),
      p2.userId.toString(),
      room.config.totalQuestions
    );

    const runtimeQuestions: BattleQuestionRuntime[] = questions.map((q) => ({
      questionId: q._id?.toString() ?? q.id,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      topic: q.topic,
      difficulty: q.difficulty,
      timeLimit: room.config.timePerQuestion,
      sentAt: null,
    }));

    // Create battle document
    await BattleModel.create({
      roomId,
      type: 'private_room',
      status: 'waiting',
      players: [
        { userId: p1.userId, name: p1.name, eloRatingBefore: user1.eloRating },
        { userId: p2.userId, name: p2.name, eloRatingBefore: user2.eloRating },
      ],
      config: {
        totalQuestions: room.config.totalQuestions,
        timePerQuestion: room.config.timePerQuestion,
        maxPlayers: 2,
      },
    });

    // Create engine
    const engine = new BattleEngine(
      battleId,
      roomId,
      'private_room',
      [
        { userId: p1.userId.toString(), name: p1.name, eloRating: user1.eloRating },
        { userId: p2.userId.toString(), name: p2.name, eloRating: user2.eloRating },
      ],
      runtimeQuestions,
      {
        totalQuestions: room.config.totalQuestions,
        timePerQuestion: room.config.timePerQuestion,
        maxPlayers: 2,
      }
    );

    // Update room
    room.status = 'started';
    room.battleId = new Types.ObjectId(battleId);
    await room.save();

    // Notify players
    emitToUser(p1.userId.toString(), 'match_found', {
      roomId,
      battleId,
      opponent: { name: p2.name, level: user2.level, rating: user2.eloRating },
    });

    emitToUser(p2.userId.toString(), 'match_found', {
      roomId,
      battleId,
      opponent: { name: p1.name, level: user1.level, rating: user1.eloRating },
    });

    logger.info({ battleId, roomId, roomCode: room.code }, 'Battle started from private room');
  } catch (err) {
    logger.error({ err, roomId: room.id }, 'Failed to start battle from room');
    for (const p of room.players) {
      emitToUser(p.userId.toString(), 'room_error', { message: 'Failed to start battle' });
    }
  }
}

/* ── Leave Room ── */

export async function leaveRoom(userId: string, roomId: string): Promise<void> {
  const room = await BattleRoomModel.findById(roomId);
  if (!room) return;

  room.players = room.players.filter((p) => p.userId.toString() !== userId) as any;

  if (room.players.length === 0) {
    await room.deleteOne();
  } else {
    room.status = 'waiting';
    await room.save();

    // Notify remaining player
    for (const p of room.players) {
      emitToUser(p.userId.toString(), 'room_update', {
        roomId: room.id,
        code: room.code,
        status: room.status,
        players: room.players.map((pl) => ({
          userId: pl.userId.toString(),
          name: pl.name,
          isReady: pl.isReady,
        })),
      });
    }
  }

  logger.info({ userId, roomId: room.id }, 'Player left room');
}
