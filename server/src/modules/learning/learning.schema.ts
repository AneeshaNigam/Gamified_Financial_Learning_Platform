import { z } from 'zod';

export const lessonParamsSchema = z.object({
  moduleId: z.string(),
  lessonId: z.string()
});

export const quizSubmissionSchema = z.object({
  answers: z.array(z.number().int().nonnegative()),
  timeSpent: z.number().min(0)
});

export const stepSubmissionSchema = z.object({
  lessonId: z.string(),
  stepIndex: z.number().int().nonnegative(),
  answer: z.string(),
  timeTaken: z.number().min(0).optional(),
});

