import { z } from 'zod';

export const createRoomBodySchema = z.object({
  config: z.object({
    totalQuestions: z.number().int().min(5).max(20).optional(),
    timePerQuestion: z.number().int().min(10).max(30).optional(),
  }).optional(),
  topics: z.array(z.string()).optional(),
});

export const joinRoomBodySchema = z.object({
  code: z.string().min(6).max(6),
});
