import { AuthenticatedSocket } from '../../config/socket';
import { checkAnswerRateLimit, lockAnswer, recordTabSwitch } from './anticheat.service';
import logger from '../../utils/logger';

/**
 * Socket middleware for anti-cheat protections.
 * Applied to answer_submit and visibility events.
 */
export function applyAntiCheatMiddleware(socket: AuthenticatedSocket): void {
  const originalEmit = socket.emit.bind(socket);

  /* ── Intercept answer submissions for rate limiting ── */
  socket.use(async (packet, next) => {
    const [event, payload] = packet;

    if (event === 'answer_submit') {
      // Rate limit check
      const allowed = await checkAnswerRateLimit(socket.userId);
      if (!allowed) {
        originalEmit('answer_ack', {
          accepted: false,
          questionIndex: payload?.questionIndex ?? -1,
          reason: 'rate_limited',
        });
        logger.warn({ userId: socket.userId }, 'Answer rate-limited');
        return; // Don't process
      }

      // Answer lock check (prevent replay)
      if (payload?.roomId !== undefined && payload?.questionIndex !== undefined) {
        const locked = await lockAnswer(payload.roomId, socket.userId, payload.questionIndex);
        if (!locked) {
          originalEmit('answer_ack', {
            accepted: false,
            questionIndex: payload.questionIndex,
            reason: 'already_answered',
          });
          logger.warn(
            { userId: socket.userId, questionIndex: payload.questionIndex },
            'Duplicate answer blocked by anti-cheat'
          );
          return;
        }
      }
    }

    // Tab switch tracking
    if (event === 'visibility_change') {
      if (payload?.battleId) {
        await recordTabSwitch(socket.userId, payload.battleId, Date.now());
      }
    }

    next();
  });
}
