import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../../config/socket';
import { createRoom, joinRoom, setPlayerReady, leaveRoom } from './room.service';
import logger from '../../utils/logger';

/**
 * Register Socket.io event handlers for the private room system.
 */
export function registerRoomHandlers(io: Server): void {
  io.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;

    /* ── Create Room ── */
    socket.on('create_room', async (payload?: { config?: any; topics?: string[] }) => {
      try {
        const result = await createRoom(
          socket.userId,
          socket.user.name,
          payload?.config
        );

        // Join Socket.io room for updates
        socket.join(`room:${result.roomId}`);

        socket.emit('room_created', {
          roomCode: result.code,
          roomId: result.roomId,
        });

        logger.debug({ userId: socket.userId, code: result.code }, 'create_room');
      } catch (err: any) {
        logger.error({ err, userId: socket.userId }, 'create_room error');
        socket.emit('room_error', { message: err.message || 'Failed to create room' });
      }
    });

    /* ── Join Room by Code ── */
    socket.on('join_room', async (payload: { code: string }) => {
      try {
        if (!payload?.code) {
          socket.emit('room_error', { message: 'Room code is required' });
          return;
        }

        const { room } = await joinRoom(
          socket.userId,
          socket.user.name,
          payload.code
        );

        // Join Socket.io room
        socket.join(`room:${room.id}`);

        socket.emit('room_joined', {
          roomId: room.id,
          code: room.code,
          status: room.status,
          players: room.players.map((p) => ({
            userId: p.userId.toString(),
            name: p.name,
            isReady: p.isReady,
          })),
        });

        logger.debug({ userId: socket.userId, code: payload.code }, 'join_room');
      } catch (err: any) {
        logger.error({ err, userId: socket.userId }, 'join_room error');
        socket.emit('room_error', { message: err.message || 'Failed to join room' });
      }
    });

    /* ── Player Ready ── */
    socket.on('player_ready', async (payload: { roomId: string }) => {
      try {
        if (!payload?.roomId) {
          socket.emit('room_error', { message: 'Room ID is required' });
          return;
        }

        await setPlayerReady(socket.userId, payload.roomId);
        logger.debug({ userId: socket.userId, roomId: payload.roomId }, 'player_ready');
      } catch (err: any) {
        logger.error({ err, userId: socket.userId }, 'player_ready error');
        socket.emit('room_error', { message: err.message || 'Failed to set ready' });
      }
    });

    /* ── Leave Room ── */
    socket.on('leave_room', async (payload: { roomId: string }) => {
      try {
        if (!payload?.roomId) return;

        await leaveRoom(socket.userId, payload.roomId);
        socket.leave(`room:${payload.roomId}`);

        logger.debug({ userId: socket.userId, roomId: payload.roomId }, 'leave_room');
      } catch (err) {
        logger.error({ err, userId: socket.userId }, 'leave_room error');
      }
    });
  });
}
