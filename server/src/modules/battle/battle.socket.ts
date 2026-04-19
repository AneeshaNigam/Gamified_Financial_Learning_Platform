import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../../config/socket';
import { getActiveBattle, BattleEngine } from './battle.engine';
import { AnswerSubmitPayload } from './battle.types';
import logger from '../../utils/logger';

/**
 * Register Socket.io event handlers for the battle system.
 */
export function registerSocketHandlers(io: Server): void {
  io.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;

    /* ── Battle Ready (after match_found, user joins battle room) ── */
    socket.on('battle_ready', async (payload: { roomId: string }) => {
      try {
        if (!payload?.roomId) {
          socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'roomId required' });
          return;
        }

        const battle = getActiveBattle(payload.roomId);
        if (!battle) {
          socket.emit('error', { code: 'BATTLE_NOT_FOUND', message: 'Battle not found' });
          return;
        }

        const state = battle.getState();
        const player = state.players.get(socket.userId);
        if (!player) {
          socket.emit('error', { code: 'NOT_IN_BATTLE', message: 'You are not in this battle' });
          return;
        }

        // Join the Socket.io battle room
        socket.join(`battle:${payload.roomId}`);
        socket.join(`user:${socket.userId}`);

        // Track that this player is ready
        player.connected = true;

        // Check if all players are connected and ready
        const allReady = Array.from(state.players.values()).every((p) => p.connected);

        if (allReady && state.status === 'waiting') {
          // Start the battle
          const players = Array.from(state.players.values());
          const config = state.config;

          // Notify both players
          for (const p of players) {
            const opponent = players.find((op) => op.userId !== p.userId);
            io.to(`user:${p.userId}`).emit('battle_start', {
              battleId: state.battleId,
              roomId: state.roomId,
              config,
              questionCount: state.questions.length,
              startTime: Date.now(),
              opponent: opponent
                ? { name: opponent.name, level: 0, rating: opponent.eloRatingBefore }
                : null,
            });
          }

          await battle.start();
        }

        logger.debug({ userId: socket.userId, roomId: payload.roomId }, 'battle_ready');
      } catch (err) {
        logger.error({ err, userId: socket.userId }, 'battle_ready error');
        socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to join battle' });
      }
    });

    /* ── Answer Submission ── */
    socket.on('answer_submit', (payload: AnswerSubmitPayload) => {
      try {
        if (!payload?.roomId || payload.questionIndex === undefined || !payload.optionId) {
          socket.emit('answer_ack', {
            accepted: false,
            questionIndex: payload?.questionIndex ?? -1,
            reason: 'invalid_payload',
          });
          return;
        }

        const battle = getActiveBattle(payload.roomId);
        if (!battle) {
          socket.emit('answer_ack', {
            accepted: false,
            questionIndex: payload.questionIndex,
            reason: 'battle_not_found',
          });
          return;
        }

        const result = battle.submitAnswer(
          socket.userId,
          payload.questionIndex,
          payload.optionId,
          payload.clientTimestamp ?? Date.now()
        );

        socket.emit('answer_ack', {
          accepted: result.accepted,
          questionIndex: payload.questionIndex,
          reason: result.reason,
        });

        logger.debug(
          { userId: socket.userId, roomId: payload.roomId, qi: payload.questionIndex, accepted: result.accepted },
          'answer_submit'
        );
      } catch (err) {
        logger.error({ err, userId: socket.userId }, 'answer_submit error');
        socket.emit('answer_ack', {
          accepted: false,
          questionIndex: payload?.questionIndex ?? -1,
          reason: 'internal_error',
        });
      }
    });

    /* ── Forfeit ── */
    socket.on('battle_forfeit', async (payload: { roomId: string }) => {
      try {
        if (!payload?.roomId) return;

        const battle = getActiveBattle(payload.roomId);
        if (!battle) return;

        await battle.handleForfeit(socket.userId);
        logger.info({ userId: socket.userId, roomId: payload.roomId }, 'battle_forfeit');
      } catch (err) {
        logger.error({ err, userId: socket.userId }, 'battle_forfeit error');
      }
    });

    /* ── Disconnect handling for active battles ── */
    socket.on('disconnect', () => {
      // Find if this user is in an active battle
      const { getAllActiveBattles } = require('./battle.engine');
      for (const [roomId, battle] of getAllActiveBattles()) {
        const state = (battle as BattleEngine).getState();
        if (state.players.has(socket.userId) && state.status === 'in_progress') {
          (battle as BattleEngine).handleDisconnect(socket.userId);
          break;
        }
      }
    });
  });
}
