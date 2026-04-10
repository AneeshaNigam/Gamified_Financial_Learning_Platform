import ApiError from '../../utils/ApiError';
import { addLucre } from '../wallet/wallet.service';
import { addXpToUser } from '../auth/auth.service';
import { ProgressModel } from '../../models/Progress';
import { ModuleModel } from '../../models/Module';
import { LessonModel } from '../../models/Lesson';
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

