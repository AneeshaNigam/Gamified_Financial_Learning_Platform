"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stepSubmissionSchema = exports.quizSubmissionSchema = exports.lessonParamsSchema = void 0;
const zod_1 = require("zod");
exports.lessonParamsSchema = zod_1.z.object({
    moduleId: zod_1.z.string(),
    lessonId: zod_1.z.string()
});
exports.quizSubmissionSchema = zod_1.z.object({
    answers: zod_1.z.array(zod_1.z.number().int().nonnegative()),
    timeSpent: zod_1.z.number().min(0)
});
exports.stepSubmissionSchema = zod_1.z.object({
    lessonId: zod_1.z.string(),
    stepIndex: zod_1.z.number().int().nonnegative(),
    answer: zod_1.z.string(),
    timeTaken: zod_1.z.number().min(0).optional(),
});
