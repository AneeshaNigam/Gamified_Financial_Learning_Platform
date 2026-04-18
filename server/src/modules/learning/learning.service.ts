import ApiError from '../../utils/ApiError';
import { addLucre } from '../wallet/wallet.service';
import { addXpToUser } from '../auth/auth.service';
import { ProgressModel } from '../../models/Progress';
import { ModuleModel } from '../../models/Module';
import { LessonModel } from '../../models/Lesson';
import { LessonV2Model } from '../../models/LessonV2';
import { QuizModel } from '../../models/Quiz';
import { AchievementModel } from '../../models/Achievement';

// Cache for modules with 5-minute TTL
let modulesCache: any[] | null = null;
let modulesCacheTime: number = 0;
const MODULES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const getProgressForUser = async (userId: string) => {
  const progress =
    (await ProgressModel.findOne({ user: userId })) ||
    (await ProgressModel.create({
      user: userId,
      achievements: await buildAchievementStateFromDB()
    }));
  return progress;
};

export const buildAchievementStateFromDB = async () => {
  const achievements = await AchievementModel.find({ isActive: true }).lean();
  return achievements.map((achievement) => ({
    id: achievement.achievementId,
    name: achievement.name,
    description: achievement.description,
    icon: achievement.icon,
    xpReward: achievement.xpReward,
    total: achievement.total,
    unlocked: false,
    progress: 0
  }));
};

export const listModulesWithProgress = async (userId: string) => {
  const progress = await getProgressForUser(userId);
  
  // Use cache if available and not expired, otherwise fetch from DB
  const now = Date.now();
  if (!modulesCache || now - modulesCacheTime > MODULES_CACHE_TTL_MS) {
    modulesCache = await ModuleModel.find({ isActive: true })
      .sort({ order: 1 })
      .lean();
    modulesCacheTime = now;
  }
  
  return { modules: modulesCache, progress };
};

export const fetchLessonContent = async (moduleId: string, lessonId: string) => {
  const lesson = await LessonModel.findOne({
    moduleId: parseInt(moduleId),
    lessonId,
    isActive: true
  }).lean();

  if (!lesson) {
    throw new ApiError(404, `Lesson ${moduleId}.${lessonId} not found`);
  }

  return {
    title: lesson.title,
    slides: lesson.slides
  };
};

export const completeLesson = async (userId: string, moduleId: number, lessonId: string) => {
  const progress = await getProgressForUser(userId);
  const lessonKey = `${moduleId}.${lessonId}`;

  // Verify lesson exists
  const lesson = await LessonModel.findOne({
    moduleId,
    lessonId,
    isActive: true
  });

  if (!lesson) {
    throw new ApiError(404, `Lesson ${lessonKey} not found`);
  }

  if (!progress.completedLessons.includes(lessonKey)) {
    progress.completedLessons.push(lessonKey);
  }

  if (!progress.completedModules.includes(moduleId - 1) && moduleId > 1) {
    // ensure sequential unlocking
    progress.completedModules = Array.from(new Set(progress.completedModules));
  }

  progress.currentModule = Math.max(progress.currentModule, moduleId);
  await progress.save();

  const [user, wallet] = await Promise.all([
    addXpToUser(userId, lesson.xpReward),
    addLucre(userId, lesson.lucreReward, `Completed Lesson ${lessonKey}`)
  ]);

  return { progress, user, wallet, lessonKey };
};

export const getQuiz = async (moduleId: number) => {
  const quiz = await QuizModel.findOne({ moduleId, isActive: true }).lean();
  
  if (!quiz) {
    throw new ApiError(404, 'Quiz not found for this module');
  }

  // Return questions in the format expected by the client
  return quiz.questions.map((q) => ({
    question: q.question,
    options: q.options,
    correct: q.correctAnswer
  }));
};

export const submitQuiz = async (userId: string, moduleId: number, answers: number[], timeSpent: number) => {
  const questions = await getQuiz(moduleId);
  
  if (answers.length !== questions.length) {
    throw new ApiError(400, 'Answer count mismatch');
  }

  let score = 0;
  answers.forEach((answer, index) => {
    if (questions[index].correct === answer) {
      score += 1;
    }
  });

  const total = questions.length;
  const percentage = (score / total) * 100;

  const progress = await getProgressForUser(userId);
  const quizId = `quiz-${moduleId}`;

  const existingIdx = progress.quizScores.findIndex((qs) => qs.quizId === quizId);
  const quizEntry = {
    quizId,
    score,
    total,
    timeSpent,
    date: new Date()
  };

  if (existingIdx >= 0) {
    progress.quizScores[existingIdx] = quizEntry;
  } else {
    progress.quizScores.push(quizEntry);
  }

  // Get total module count from database
  const moduleCount = await ModuleModel.countDocuments({ isActive: true });

  if (percentage >= 70 && !progress.completedModules.includes(moduleId)) {
    progress.completedModules.push(moduleId);
    progress.currentModule = Math.min(moduleId + 1, moduleCount);
  }

  await progress.save();

  const xpEarned = score * 10;
  const moneyEarned = Math.floor(percentage);

  const [user, wallet] = await Promise.all([
    addXpToUser(userId, xpEarned),
    addLucre(userId, moneyEarned, `Quiz ${quizId}: ${score}/${total}`)
  ]);

  return { progress, user, wallet, quiz: quizEntry, percentage };
};

// ── Dynamic Lesson Engine ─────────────────────────────────────────────────────

import { getNextLesson, AdaptiveLessonResult } from './adaptive.service';

/**
 * Returns the next recommended lesson for the user using the adaptive engine.
 * Replaces the old sequential-order lookup.
 */
export const getCurrentLesson = async (userId: string): Promise<AdaptiveLessonResult> => {
  return getNextLesson(userId);
};

/**
 * Evaluates an MCQ step answer, awards XP, **tracks behavior**, returns feedback.
 */
export const submitStep = async (
  userId: string,
  lessonId: string,
  stepIndex: number,
  answer: string,
  timeTaken?: number
) => {
  const lesson = await LessonV2Model.findById(lessonId).lean();
  if (!lesson) throw new ApiError(404, 'Lesson not found');

  const step = lesson.steps[stepIndex];
  if (!step) throw new ApiError(400, `Step ${stepIndex} does not exist`);
  if (step.type !== 'mcq') throw new ApiError(400, 'Step is not an MCQ');

  const mcqStep = step as any;
  const isCorrect = mcqStep.correctAnswer === answer;
  const xpEarned = isCorrect ? mcqStep.xp : Math.max(2, Math.floor(mcqStep.xp / 4));

  const updatedUser = await addXpToUser(userId, xpEarned);
  const isLastStep = stepIndex === lesson.steps.length - 1;

  // ── Behavior tracking ───────────────────────────────────────────────────────
  const progress = await getProgressForUser(userId);
  const topic = lesson.topic || 'general';
  const responseMs = timeTaken ?? 0;

  progress.totalAnswered = (progress.totalAnswered || 0) + 1;
  if (isCorrect) {
    progress.totalCorrect = (progress.totalCorrect || 0) + 1;
  }
  progress.totalResponseTime = (progress.totalResponseTime || 0) + responseMs;
  progress.accuracy = progress.totalAnswered > 0
    ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100)
    : 0;
  progress.averageResponseTime = progress.totalAnswered > 0
    ? Math.round(progress.totalResponseTime / progress.totalAnswered)
    : 0;
  progress.totalXP = updatedUser.xp;

  // Update topicStats (Mongoose Map)
  if (!progress.topicStats) {
    progress.topicStats = new Map();
  }
  const stat = progress.topicStats.get(topic) || { correct: 0, wrong: 0 };
  if (isCorrect) {
    stat.correct += 1;
  } else {
    stat.wrong += 1;
  }
  progress.topicStats.set(topic, stat);
  await progress.save();

  return {
    isCorrect,
    correctAnswer: mcqStep.correctAnswer,
    explanation: mcqStep.explanation,
    xpEarned,
    nextStepIndex: stepIndex + 1,
    lessonCompleted: isLastStep,
    updatedUser,
  };
};

/**
 * Marks a lesson complete, awards bonus XP & lucre,
 * then uses the adaptive engine to recommend the next lesson.
 */
export const completeLessonV2 = async (userId: string, lessonId: string) => {
  const lesson = await LessonV2Model.findById(lessonId).lean();
  if (!lesson) throw new ApiError(404, 'Lesson not found');

  const lessonKey = `${lesson.moduleId}.${lesson.lessonId}`;
  const progress = await getProgressForUser(userId);

  if (!progress.completedLessons.includes(lessonKey)) {
    progress.completedLessons.push(lessonKey);
    progress.currentModule = Math.max(progress.currentModule, lesson.moduleId);
    await progress.save();

    await Promise.all([
      addXpToUser(userId, lesson.xpReward),
      addLucre(userId, lesson.lucreReward, `Completed Lesson ${lessonKey}`),
    ]);
  }

  // Use adaptive engine for next lesson recommendation
  try {
    const adaptiveResult = await getNextLesson(userId);

    if (adaptiveResult.allDone) {
      return { lessonKey, nextLesson: null, allDone: true };
    }

    return {
      lessonKey,
      nextLesson: {
        lessonId: adaptiveResult.lessonId,
        moduleId: adaptiveResult.moduleId,
        lessonKey: adaptiveResult.lessonKey,
        title: adaptiveResult.title,
        order: adaptiveResult.order,
        steps: adaptiveResult.steps,
        xpReward: adaptiveResult.xpReward,
        topic: adaptiveResult.topic,
        difficulty: adaptiveResult.difficulty,
        adaptiveReason: adaptiveResult.adaptiveReason,
      },
      allDone: false,
    };
  } catch {
    // If adaptive fails (e.g., no lessons), treat as all done
    return { lessonKey, nextLesson: null, allDone: true };
  }
};
