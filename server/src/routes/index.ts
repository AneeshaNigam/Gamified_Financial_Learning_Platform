import { Router } from 'express';

import authRoutes from '../modules/auth/auth.routes';
import learningRoutes from '../modules/learning/learning.routes';
import walletRoutes from '../modules/wallet/wallet.routes';
import stockRoutes from '../modules/stocks/stocks.routes';
import achievementRoutes from '../modules/achievements/achievements.routes';
import leaderboardRoutes from '../modules/leaderboard/leaderboard.routes';
import testimonialsRoutes from '../modules/testimonials/testimonials.routes';
import battleRoutes from '../modules/battle/battle.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/learning', learningRoutes);
router.use('/wallet', walletRoutes);
router.use('/stocks', stockRoutes);
router.use('/achievements', achievementRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/testimonials', testimonialsRoutes);
router.use('/battle', battleRoutes);

export default router;
