import { z } from 'zod';
import { QuestionBankModel } from '../../models/QuestionBank';
import { env } from '../../config/env';
import logger from '../../utils/logger';

/* ── LLM-Generated Question Schema (validation) ── */

const generatedQuestionSchema = z.object({
  questionText: z.string().min(10),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string().min(1),
    })
  ).min(2).max(6),
  correctAnswer: z.string(),
  explanation: z.string().default(''),
  topic: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string()).default([]),
});

const generatedQuestionsArraySchema = z.object({
  questions: z.array(generatedQuestionSchema),
});

/* ── Generate Questions via LLM ── */

/**
 * Generate new questions using an LLM API (OpenAI).
 * This is an optional feature — only runs if OPENAI_API_KEY is configured.
 *
 * @param topic - Financial topic to generate questions about
 * @param difficulty - Target difficulty level
 * @param count - Number of questions to generate
 * @returns Array of generated question documents saved to QuestionBank
 */
export async function generateQuestionsWithLLM(
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  count: number = 5
): Promise<void> {
  if (!env.OPENAI_API_KEY) {
    logger.debug('LLM question generation skipped: OPENAI_API_KEY not configured');
    return;
  }

  const prompt = buildPrompt(topic, difficulty, count);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a financial literacy quiz question generator for young learners (ages 5-25). Generate accurate, educational multiple-choice questions. Always return valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse and validate
    const parsed = JSON.parse(content);
    const validated = generatedQuestionsArraySchema.parse(parsed);

    // Save to database
    const docs = validated.questions.map((q) => ({
      ...q,
      source: 'ai' as const,
      isActive: true,
      timesUsed: 0,
      avgCorrectRate: 0,
      avgResponseTimeMs: 0,
    }));

    const inserted = await QuestionBankModel.insertMany(docs, { ordered: false });

    logger.info(
      { topic, difficulty, requested: count, inserted: inserted.length },
      'LLM-generated questions saved'
    );
  } catch (err) {
    logger.error({ err, topic, difficulty }, 'LLM question generation failed');
  }
}

function buildPrompt(topic: string, difficulty: string, count: number): string {
  return `Generate exactly ${count} multiple-choice financial literacy questions about "${topic}" at "${difficulty}" difficulty level.

Requirements:
- Each question must have exactly 4 options with unique IDs (a, b, c, d)
- One option must be the correct answer
- Include a brief explanation for the correct answer
- Questions should be appropriate for young learners (ages 5-25)
- Questions should teach real financial concepts
- For "easy": basic concepts, simple math
- For "medium": applied scenarios, moderate complexity
- For "hard": advanced concepts, multi-step reasoning

Return JSON in this exact format:
{
  "questions": [
    {
      "questionText": "...",
      "options": [
        { "id": "a", "text": "..." },
        { "id": "b", "text": "..." },
        { "id": "c", "text": "..." },
        { "id": "d", "text": "..." }
      ],
      "correctAnswer": "a",
      "explanation": "...",
      "topic": "${topic}",
      "difficulty": "${difficulty}",
      "tags": ["tag1", "tag2"]
    }
  ]
}`;
}

/**
 * Check if a topic/difficulty combination needs more questions
 * and auto-generate if below threshold.
 */
export async function ensureQuestionPool(
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  minQuestions: number = 20
): Promise<void> {
  const count = await QuestionBankModel.countDocuments({
    topic,
    difficulty,
    isActive: true,
  });

  if (count < minQuestions) {
    logger.info(
      { topic, difficulty, available: count, minimum: minQuestions },
      'Question pool below threshold — triggering LLM generation'
    );
    await generateQuestionsWithLLM(topic, difficulty, minQuestions - count);
  }
}
