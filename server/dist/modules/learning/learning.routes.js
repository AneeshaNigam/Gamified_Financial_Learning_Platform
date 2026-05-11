"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const validate_1 = __importDefault(require("../../middleware/validate"));
const learning_schema_1 = require("./learning.schema");
const learning_controller_1 = require("./learning.controller");
const router = (0, express_1.Router)();
// Legacy slide-based routes (kept for backward compat)
router.get('/modules', auth_1.authenticate, learning_controller_1.getModules);
router.get('/progress', auth_1.authenticate, learning_controller_1.getProgressController);
router.get('/lessons/:moduleId/:lessonId', auth_1.authenticate, learning_controller_1.getLesson);
router.post('/lessons/:moduleId/:lessonId/complete', auth_1.authenticate, learning_controller_1.completeLessonController);
router.get('/quizzes/:moduleId', auth_1.authenticate, learning_controller_1.getQuizController);
router.post('/quizzes/:moduleId/submit', auth_1.authenticate, (0, validate_1.default)(learning_schema_1.quizSubmissionSchema), learning_controller_1.submitQuizController);
// Dynamic lesson engine routes
router.get('/current', auth_1.authenticate, learning_controller_1.getCurrentLessonController);
router.post('/submit', auth_1.authenticate, learning_controller_1.submitStepController);
router.post('/complete', auth_1.authenticate, learning_controller_1.completeLessonV2Controller);
exports.default = router;
