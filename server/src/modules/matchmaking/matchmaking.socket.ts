import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../../config/socket';
import { addToQueue, removeFromQueue, startMatchmakingLoop } from './matchmaking.service';
import logger from '../../utils/logger';

/**
 * Register Socket.io event handlers for the matchmaking queue system.
 */
export function registerMatchmakingHandlers(io: Server): void {
  // Start the matchmaking loop when the server initializes
  startMatchmakingLoop();

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;

    /* ── Join Queue ── */
    socket.on('join_queue', async (payload: { mode?: 'quick_match' | 'ranked' }) => {
      try {
        const user = socket.user;
        if (!user) {
          socket.emit('queue_error', { message: 'Not authenticated' });
          return;
        }

        const mode = payload?.mode ?? 'quick_match';

        await addToQueue({
          userId: socket.userId,
          name: user.name,
          level: user.level,
          knowledgeLevel: user.knowledgeLevel ?? 'Beginner',
          xp: user.xp,
          eloRating: user.eloRating ?? 1200,
          socketId: socket.id,
          joinedAt: Date.now(),
          mode,
        });

        logger.debug({ userId: socket.userId, mode }, 'join_queue');
      } catch (err) {
        logger.error({ err, userId: socket.userId }, 'join_queue error');
        socket.emit('queue_error', { message: 'Failed to join queue' });
      }
    });

    /* ── Leave Queue ── */
    socket.on('leave_queue', async () => {
      try {
        await removeFromQueue(socket.userId);
        logger.debug({ userId: socket.userId }, 'leave_queue');
      } catch (err) {
        logger.error({ err, userId: socket.userId }, 'leave_queue error');
      }
    });

    /* ── Cleanup on disconnect: remove from queue ── */
    socket.on('disconnect', async () => {
      try {
        await removeFromQueue(socket.userId);
      } catch {
        // ignore cleanup errors
      }
    });
  });
}
