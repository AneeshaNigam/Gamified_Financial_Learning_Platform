import { z } from 'zod';

export const createRoomSchema = z.object({
  body: z.object({
    config: z.object({
      totalQuestions: z.number().int().min(5).max(20).optional().default(10),
      timePerQuestion: z.number().int().min(10).max(30).optional().default(15),
    }).optional(),
    topics: z.array(z.string()).optional(),
  }),
});

export const joinRoomSchema = z.object({
  body: z.object({
    code: z.string().length(6).toUpperCase(),
  }),
});

export const getBattleHistorySchema = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
  }),
});

export const getBattleByIdSchema = z.object({
  params: z.object({
    battleId: z.string().min(1),
  }),
});
