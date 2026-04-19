import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../../config/socket';
import { setPresence, clearPresence, refreshHeartbeat } from './presence.service';
import logger from '../../utils/logger';

/**
 * Register Socket.io event handlers for user presence tracking.
 */
export function registerPresenceHandlers(io: Server): void {
  io.on('connection', async (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;

    // Set user online on connect
    await setPresence(socket.userId, 'online');

    logger.debug({ userId: socket.userId }, 'Presence: user online');

    /* ── Heartbeat ── */
    socket.on('heartbeat', async () => {
      await refreshHeartbeat(socket.userId);
    });

    /* ── Status Change ── */
    socket.on('presence_change', async (payload: { status: 'idle' | 'online' }) => {
      const validStatuses = ['idle', 'online'];
      if (payload?.status && validStatuses.includes(payload.status)) {
        await setPresence(socket.userId, payload.status);
      }
    });

    /* ── Disconnect ── */
    socket.on('disconnect', async () => {
      // Small delay to allow for reconnection
      setTimeout(async () => {
        // Check if user reconnected to another socket
        const sockets = await io.in(`user:${socket.userId}`).fetchSockets();
        if (sockets.length === 0) {
          await clearPresence(socket.userId);
          logger.debug({ userId: socket.userId }, 'Presence: user offline');
        }
      }, 5000);
    });
  });
}
