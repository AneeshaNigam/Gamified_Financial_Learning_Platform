"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeLessonV2 = exports.submitStep = exports.getCurrentLesson = exports.submitQuiz = exports.getQuiz = exports.completeLesson = exports.fetchLessonContent = exports.listModulesWithProgress = exports.buildAchievementStateFromDB = exports.getProgressForUser = void 0;
const ApiError_1 = __importDefault(require("../../utils/ApiError"));
const wallet_service_1 = require("../wallet/wallet.service");
const auth_service_1 = require("../auth/auth.service");
const Progress_1 = require("../../models/Progress");
const Module_1 = require("../../models/Module");
const Lesson_1 = require("../../models/Lesson");
const LessonV2_1 = require("../../models/LessonV2");
const Quiz_1 = require("../../models/Quiz");
const Achievement_1 = require("../../models/Achievement");
// Cache for modules with 5-minute TTL
let modulesCache = null;
let modulesCacheTime = 0;
const MODULES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const getProgressForUser = async (userId) => {
    const progress = (await Progress_1.ProgressModel.findOne({ user: userId })) ||
        (await Progress_1.ProgressModel.create({
            user: userId,
            achievements: await (0, exports.buildAchievementStateFromDB)()
        }));
    return progress;
};
exports.getProgressForUser = getProgressForUser;
const buildAchievementStateFromDB = async () => {
    const achievements = await Achievement_1.AchievementModel.find({ isActive: true }).lean();
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
exports.buildAchievementStateFromDB = buildAchievementStateFromDB;
const listModulesWithProgress = async (userId) => {
    const progress = await (0, exports.getProgressForUser)(userId);
    // Use cache if available and not expired, otherwise fetch from DB
    const now = Date.now();
    if (!modulesCache || now - modulesCacheTime > MODULES_CACHE_TTL_MS) {
        modulesCache = await Module_1.ModuleModel.find({ isActive: true })
            .sort({ order: 1 })
            .lean();
        modulesCacheTime = now;
    }
    return { modules: modulesCache, progress };
};
exports.listModulesWithProgress = listModulesWithProgress;
const fetchLessonContent = async (moduleId, lessonId) => {
    const lesson = await Lesson_1.LessonModel.findOne({
        moduleId: parseInt(moduleId),
        lessonId,
        isActive: true
    }).lean();
    if (!lesson) {
        throw new ApiError_1.default(404, `Lesson ${moduleId}.${lessonId} not found`);
    }
    return {
        title: lesson.title,
        slides: lesson.slides
    };
};
exports.fetchLessonContent = fetchLessonContent;
const completeLesson = async (userId, moduleId, lessonId) => {
    const progress = await (0, exports.getProgressForUser)(userId);
    const lessonKey = `${moduleId}.${lessonId}`;
    // Verify lesson exists
    const lesson = await Lesson_1.LessonModel.findOne({
        moduleId,
        lessonId,
        isActive: true
    });
    if (!lesson) {
        throw new ApiError_1.default(404, `Lesson ${lessonKey} not found`);
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
        (0, auth_service_1.addXpToUser)(userId, lesson.xpReward),
        (0, wallet_service_1.addLucre)(userId, lesson.lucreReward, `Completed Lesson ${lessonKey}`)
    ]);
    return { progress, user, wallet, lessonKey };
};
exports.completeLesson = completeLesson;
const getQuiz = async (moduleId) => {
    const quiz = await Quiz_1.QuizModel.findOne({ moduleId, isActive: true }).lean();
    if (!quiz) {
        throw new ApiError_1.default(404, 'Quiz not found for this module');
    }
    // Return questions in the format expected by the client
    return quiz.questions.map((q) => ({
        question: q.question,
        options: q.options,
        correct: q.correctAnswer
    }));
};
exports.getQuiz = getQuiz;
const submitQuiz = async (userId, moduleId, answers, timeSpent) => {
    const questions = await (0, exports.getQuiz)(moduleId);
    if (answers.length !== questions.length) {
        throw new ApiError_1.default(400, 'Answer count mismatch');
    }
    let score = 0;
    answers.forEach((answer, index) => {
        if (questions[index].correct === answer) {
            score += 1;
        }
    });
    const total = questions.length;
    const percentage = (score / total) * 100;
    const progress = await (0, exports.getProgressForUser)(userId);
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
    }
    else {
        progress.quizScores.push(quizEntry);
    }
    // Get total module count from database
    const moduleCount = await Module_1.ModuleModel.countDocuments({ isActive: true });
    if (percentage >= 70 && !progress.completedModules.includes(moduleId)) {
        progress.completedModules.push(moduleId);
        progress.currentModule = Math.min(moduleId + 1, moduleCount);
    }
    await progress.save();
    const xpEarned = score * 10;
    const moneyEarned = Math.floor(percentage);
    const [user, wallet] = await Promise.all([
        (0, auth_service_1.addXpToUser)(userId, xpEarned),
        (0, wallet_service_1.addLucre)(userId, moneyEarned, `Quiz ${quizId}: ${score}/${total}`)
    ]);
    return { progress, user, wallet, quiz: quizEntry, percentage };
};
exports.submitQuiz = submitQuiz;
// ── Dynamic Lesson Engine ─────────────────────────────────────────────────────
const adaptive_service_1 = require("./adaptive.service");
/**
 * Returns the next recommended lesson for the user using the adaptive engine.
 * Replaces the old sequential-order lookup.
 */
const getCurrentLesson = async (userId) => {
    return (0, adaptive_service_1.getNextLesson)(userId);
};
exports.getCurrentLesson = getCurrentLesson;
/**
 * Evaluates an MCQ step answer, awards XP, **tracks behavior**, returns feedback.
 */
const submitStep = async (userId, lessonId, stepIndex, answer, timeTaken) => {
    const lesson = await LessonV2_1.LessonV2Model.findById(lessonId).lean();
    if (!lesson)
        throw new ApiError_1.default(404, 'Lesson not found');
    const step = lesson.steps[stepIndex];
    if (!step)
        throw new ApiError_1.default(400, `Step ${stepIndex} does not exist`);
    if (step.type !== 'mcq')
        throw new ApiError_1.default(400, 'Step is not an MCQ');
    const mcqStep = step;
    const isCorrect = mcqStep.correctAnswer === answer;
    const xpEarned = isCorrect ? mcqStep.xp : Math.max(2, Math.floor(mcqStep.xp / 4));
    const updatedUser = await (0, auth_service_1.addXpToUser)(userId, xpEarned);
    const isLastStep = stepIndex === lesson.steps.length - 1;
    // ── Behavior tracking ───────────────────────────────────────────────────────
    const progress = await (0, exports.getProgressForUser)(userId);
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
    }
    else {
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
exports.submitStep = submitStep;
/**
 * Marks a lesson complete, awards bonus XP & lucre,
 * then uses the adaptive engine to recommend the next lesson.
 */
const completeLessonV2 = async (userId, lessonId) => {
    const lesson = await LessonV2_1.LessonV2Model.findById(lessonId).lean();
    if (!lesson)
        throw new ApiError_1.default(404, 'Lesson not found');
    const lessonKey = `${lesson.moduleId}.${lesson.lessonId}`;
    const progress = await (0, exports.getProgressForUser)(userId);
    if (!progress.completedLessons.includes(lessonKey)) {
        progress.completedLessons.push(lessonKey);
        progress.currentModule = Math.max(progress.currentModule, lesson.moduleId);
        await progress.save();
        await Promise.all([
            (0, auth_service_1.addXpToUser)(userId, lesson.xpReward),
            (0, wallet_service_1.addLucre)(userId, lesson.lucreReward, `Completed Lesson ${lessonKey}`),
        ]);
    }
    // Use adaptive engine for next lesson recommendation
    try {
        const adaptiveResult = await (0, adaptive_service_1.getNextLesson)(userId);
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
    }
    catch {
        // If adaptive fails (e.g., no lessons), treat as all done
        return { lessonKey, nextLesson: null, allDone: true };
    }
};
exports.completeLessonV2 = completeLessonV2;
