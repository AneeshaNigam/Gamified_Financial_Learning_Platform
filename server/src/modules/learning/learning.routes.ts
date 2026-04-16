import { Router } from 'express';

import { authenticate } from '../../middleware/auth';
import validate from '../../middleware/validate';
import { quizSubmissionSchema } from './learning.schema';
import {
  completeLessonController,
  getLesson,
  getModules,
  getProgressController,
  getQuizController,
  submitQuizController,
  // Dynamic lesson engine
  getCurrentLessonController,
  submitStepController,
  completeLessonV2Controller,
} from './learning.controller';

const router = Router();

// Legacy slide-based routes (kept for backward compat)
router.get('/modules', authenticate, getModules);
router.get('/progress', authenticate, getProgressController);
router.get('/lessons/:moduleId/:lessonId', authenticate, getLesson);
router.post('/lessons/:moduleId/:lessonId/complete', authenticate, completeLessonController);
router.get('/quizzes/:moduleId', authenticate, getQuizController);
router.post('/quizzes/:moduleId/submit', authenticate, validate(quizSubmissionSchema), submitQuizController);

// Dynamic lesson engine routes
router.get('/current', authenticate, getCurrentLessonController);
router.post('/submit', authenticate, submitStepController);
router.post('/complete', authenticate, completeLessonV2Controller);

export default router;

