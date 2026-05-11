"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeLessonV2Controller = exports.submitStepController = exports.getCurrentLessonController = exports.getProgressController = exports.submitQuizController = exports.getQuizController = exports.completeLessonController = exports.getLesson = exports.getModules = void 0;
const ApiError_1 = __importDefault(require("../../utils/ApiError"));
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const response_1 = __importDefault(require("../../utils/response"));
const achievements_service_1 = require("../achievements/achievements.service");
const learning_service_1 = require("./learning.service");
exports.getModules = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user)
        throw new ApiError_1.default(401, 'Authentication required');
    const data = await (0, learning_service_1.listModulesWithProgress)(req.user.id);
    return (0, response_1.default)(res, data);
});
exports.getLesson = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user)
        throw new ApiError_1.default(401, 'Authentication required');
    const { moduleId, lessonId } = req.params;
    const content = await (0, learning_service_1.fetchLessonContent)(moduleId, lessonId);
    return (0, response_1.default)(res, content);
});
exports.completeLessonController = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user)
        throw new ApiError_1.default(401, 'Authentication required');
    const moduleId = parseInt(req.params.moduleId, 10);
    const lessonId = req.params.lessonId;
    const result = await (0, learning_service_1.completeLesson)(req.user.id, moduleId, lessonId);
    await (0, achievements_service_1.evaluateAchievements)(req.user.id);
    return (0, response_1.default)(res, result, 'Lesson complete');
});
exports.getQuizController = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user)
        throw new ApiError_1.default(401, 'Authentication required');
    const moduleId = parseInt(req.params.moduleId, 10);
    const questions = await (0, learning_service_1.getQuiz)(moduleId);
    return (0, response_1.default)(res, { questions });
});
exports.submitQuizController = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user)
        throw new ApiError_1.default(401, 'Authentication required');
    const moduleId = parseInt(req.params.moduleId, 10);
    const { answers, timeSpent } = req.body;
    const result = await (0, learning_service_1.submitQuiz)(req.user.id, moduleId, answers, timeSpent);
    await (0, achievements_service_1.evaluateAchievements)(req.user.id);
    return (0, response_1.default)(res, result, 'Quiz submitted');
});
exports.getProgressController = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user)
        throw new ApiError_1.default(401, 'Authentication required');
    const progress = await (0, learning_service_1.getProgressForUser)(req.user.id);
    return (0, response_1.default)(res, progress);
});
// ── Dynamic Lesson Engine Controllers ────────────────────────────────────────
exports.getCurrentLessonController = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user)
        throw new ApiError_1.default(401, 'Authentication required');
    const lesson = await (0, learning_service_1.getCurrentLesson)(req.user.id);
    return (0, response_1.default)(res, lesson);
});
exports.submitStepController = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user)
        throw new ApiError_1.default(401, 'Authentication required');
    const { lessonId, stepIndex, answer, timeTaken } = req.body;
    if (!lessonId || stepIndex === undefined || !answer) {
        throw new ApiError_1.default(400, 'lessonId, stepIndex, and answer are required');
    }
    const result = await (0, learning_service_1.submitStep)(req.user.id, lessonId, Number(stepIndex), String(answer), timeTaken ? Number(timeTaken) : undefined);
    return (0, response_1.default)(res, result);
});
exports.completeLessonV2Controller = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user)
        throw new ApiError_1.default(401, 'Authentication required');
    const { lessonId } = req.body;
    if (!lessonId)
        throw new ApiError_1.default(400, 'lessonId is required');
    const result = await (0, learning_service_1.completeLessonV2)(req.user.id, String(lessonId));
    await (0, achievements_service_1.evaluateAchievements)(req.user.id);
    return (0, response_1.default)(res, result, 'Lesson complete!');
});
