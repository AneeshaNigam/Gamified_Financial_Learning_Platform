import { Router } from 'express';

import { authenticate } from '../../middleware/auth';
import {
  getBattleHistoryController,
  getBattleDetailController,
  getBattleAnalyticsController,
  getBattleLeaderboardController,
} from './battle.controller';
import {
  createRoomController,
  joinRoomController,
} from '../room/room.controller';
import {
  getRatingHistoryController,
} from '../rating/rating.controller';

const router = Router();

/* ── Battle History & Analytics ── */
router.get('/history', authenticate, getBattleHistoryController);
router.get('/analytics/me', authenticate, getBattleAnalyticsController);
router.get('/:battleId', authenticate, getBattleDetailController);

/* ── Battle Leaderboard ── */
router.get('/leaderboard', getBattleLeaderboardController);

/* ── Private Rooms (REST) ── */
router.post('/rooms', authenticate, createRoomController);
router.post('/rooms/join', authenticate, joinRoomController);

/* ── Rating History ── */
router.get('/rating/history', authenticate, getRatingHistoryController);

export default router;
