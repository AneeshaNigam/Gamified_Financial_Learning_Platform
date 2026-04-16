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

/**
 * Returns the current (next uncompleted) lesson for the user.
 * Lessons are ordered by their global `order` field.
 */
export const getCurrentLesson = async (userId: string) => {
  const progress = await getProgressForUser(userId);
  const completedKeys = new Set(progress.completedLessons);

  const allLessons = await LessonV2Model.find({ isActive: true })
    .sort({ order: 1 })
    .lean();

  if (allLessons.length === 0) {
    throw new ApiError(404, 'No lessons found. Run: npm run seed:v2');
  }

  const currentLesson =
    allLessons.find((l) => !completedKeys.has(`${l.moduleId}.${l.lessonId}`)) ??
    allLessons[allLessons.length - 1];

  const lessonKey = `${currentLesson.moduleId}.${currentLesson.lessonId}`;
  const isCompleted = completedKeys.has(lessonKey);

  // Strip correctAnswer before sending to client
  const clientSteps = currentLesson.steps.map((step) => {
    if (step.type === 'mcq') {
      const { correctAnswer: _ca, explanation: _ex, ...rest } = step as any;
      return rest;
    }
    return step;
  });

  return {
    lessonId: String(currentLesson._id),
    moduleId: currentLesson.moduleId,
    lessonKey,
    title: currentLesson.title,
    order: currentLesson.order,
    totalLessons: allLessons.length,
    steps: clientSteps,
    xpReward: currentLesson.xpReward,
    isCompleted,
    allDone: isCompleted && String(currentLesson._id) === String(allLessons[allLessons.length - 1]._id),
  };
};

/**
 * Evaluates an MCQ step answer, awards XP, returns feedback.
 */
export const submitStep = async (
  userId: string,
  lessonId: string,
  stepIndex: number,
  answer: string
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
 * Marks a lesson complete, awards bonus XP & lucre, returns the next lesson.
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

  // Next lesson
  const nextLesson = await LessonV2Model.findOne({
    isActive: true,
    order: { $gt: lesson.order },
  })
    .sort({ order: 1 })
    .lean();

  if (!nextLesson) {
    return { lessonKey, nextLesson: null, allDone: true };
  }

  const clientSteps = nextLesson.steps.map((step) => {
    if (step.type === 'mcq') {
      const { correctAnswer: _ca, explanation: _ex, ...rest } = step as any;
      return rest;
    }
    return step;
  });

  return {
    lessonKey,
    nextLesson: {
      lessonId: String(nextLesson._id),
      moduleId: nextLesson.moduleId,
      lessonKey: `${nextLesson.moduleId}.${nextLesson.lessonId}`,
      title: nextLesson.title,
      order: nextLesson.order,
      steps: clientSteps,
      xpReward: nextLesson.xpReward,
    },
    allDone: false,
  };
};
