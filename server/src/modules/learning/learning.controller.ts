import { Request, Response } from 'express';

import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';
import sendSuccess from '../../utils/response';
import { evaluateAchievements } from '../achievements/achievements.service';
import {
  completeLesson,
  fetchLessonContent,
  getProgressForUser,
  getQuiz,
  listModulesWithProgress,
  submitQuiz,
  // Dynamic lesson engine
  getCurrentLesson,
  submitStep,
  completeLessonV2,
} from './learning.service';

export const getModules = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const data = await listModulesWithProgress(req.user.id);
  return sendSuccess(res, data);
});

export const getLesson = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const { moduleId, lessonId } = req.params;
  const content = await fetchLessonContent(moduleId, lessonId);
  return sendSuccess(res, content);
});

export const completeLessonController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const moduleId = parseInt(req.params.moduleId, 10);
  const lessonId = req.params.lessonId;
  const result = await completeLesson(req.user.id, moduleId, lessonId);
  await evaluateAchievements(req.user.id);
  return sendSuccess(res, result, 'Lesson complete');
});

export const getQuizController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const moduleId = parseInt(req.params.moduleId, 10);
  const questions = await getQuiz(moduleId);
  return sendSuccess(res, { questions });
});

export const submitQuizController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const moduleId = parseInt(req.params.moduleId, 10);
  const { answers, timeSpent } = req.body;
  const result = await submitQuiz(req.user.id, moduleId, answers, timeSpent);
  await evaluateAchievements(req.user.id);
  return sendSuccess(res, result, 'Quiz submitted');
});

export const getProgressController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const progress = await getProgressForUser(req.user.id);
  return sendSuccess(res, progress);
});

// ── Dynamic Lesson Engine Controllers ────────────────────────────────────────

export const getCurrentLessonController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const lesson = await getCurrentLesson(req.user.id);
  return sendSuccess(res, lesson);
});

export const submitStepController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const { lessonId, stepIndex, answer } = req.body;
  if (!lessonId || stepIndex === undefined || !answer) {
    throw new ApiError(400, 'lessonId, stepIndex, and answer are required');
  }
  const result = await submitStep(req.user.id, lessonId, Number(stepIndex), String(answer));
  return sendSuccess(res, result);
});

export const completeLessonV2Controller = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  const { lessonId } = req.body;
  if (!lessonId) throw new ApiError(400, 'lessonId is required');
  const result = await completeLessonV2(req.user.id, String(lessonId));
  await evaluateAchievements(req.user.id);
  return sendSuccess(res, result, 'Lesson complete!');
});
