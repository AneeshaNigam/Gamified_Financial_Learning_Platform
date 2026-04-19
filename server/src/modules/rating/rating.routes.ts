import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getRatingHistoryController } from './rating.controller';

const router = Router();

router.get('/history', authenticate, getRatingHistoryController);

export default router;
