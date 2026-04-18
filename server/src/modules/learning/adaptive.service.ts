/**
 * Adaptive Decision Engine
 *
 * Rule-based lesson recommendation based on user behavior.
 * Designed so the implementation can later be swapped to an AI API call
 * without changing any calling code.
 */

import { LessonV2Model, ILessonV2 } from '../../models/LessonV2';
import { getProgressForUser } from './learning.service';
import { ITopicStat } from '../../models/Progress';

// ── Types ───────────────────────────────────────────────────────────────────────

export type LessonStrategy = 'rule-based' | 'ai';

export interface AdaptiveLessonResult {
  lessonId: string;
  moduleId: number;
  lessonKey: string;
  title: string;
  order: number;
  totalLessons: number;
  steps: any[];
  xpReward: number;
  isCompleted: boolean;
  allDone: boolean;
  /** Adaptive metadata returned to client */
  topic: string;
  difficulty: string;
  adaptiveReason?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

/** Strip correctAnswer & explanation from MCQ steps before sending to client */
const sanitizeSteps = (steps: any[]) =>
  steps.map((step) => {
    if (step.type === 'mcq') {
      const { correctAnswer: _ca, explanation: _ex, ...rest } = step;
      return rest;
    }
    return step;
  });

/** Build the standard response shape from a lesson document */
const buildResult = (
  lesson: any,
  totalLessons: number,
  isCompleted: boolean,
  allDone: boolean,
  reason?: string
): AdaptiveLessonResult => ({
  lessonId: String(lesson._id),
  moduleId: lesson.moduleId,
  lessonKey: `${lesson.moduleId}.${lesson.lessonId}`,
  title: lesson.title,
  order: lesson.order,
  totalLessons,
  steps: sanitizeSteps(lesson.steps),
  xpReward: lesson.xpReward,
  isCompleted,
  allDone,
  topic: lesson.topic,
  difficulty: lesson.difficulty,
  adaptiveReason: reason,
});

// ── Adaptive Engine ─────────────────────────────────────────────────────────────

/**
 * Identifies the user's weakest topic based on topicStats.
 * A topic needs at least 2 answers to be considered.
 * Returns the topic with the highest error rate (wrong / total).
 */
function findWeakestTopic(topicStats: Map<string, ITopicStat>): string | null {
  let worstTopic: string | null = null;
  let worstErrorRate = -1;

  for (const [topic, stat] of topicStats.entries()) {
    const total = stat.correct + stat.wrong;
    if (total < 2) continue; // not enough signal
    const errorRate = stat.wrong / total;
    if (errorRate > worstErrorRate) {
      worstErrorRate = errorRate;
      worstTopic = topic;
    }
  }

  return worstTopic;
}

/**
 * Returns the next recommended lesson for the user.
 *
 * Decision rules:
 *   accuracy < 50%  → easier lesson on weakest topic
 *   50% ≤ accuracy ≤ 80% → normal sequential progression
 *   accuracy > 80%  → skip to harder / advanced lesson
 *
 * Falls back to sequential order when no adaptive match is found.
 *
 * @param _strategy — reserved for future AI-based strategy swap
 */
export async function getNextLesson(
  userId: string,
  _strategy: LessonStrategy = 'rule-based'
): Promise<AdaptiveLessonResult> {
  const progress = await getProgressForUser(userId);
  const completedKeys = new Set(progress.completedLessons);

  const allLessons = await LessonV2Model.find({ isActive: true })
    .sort({ order: 1 })
    .lean();

  if (allLessons.length === 0) {
    throw new Error('No lessons found. Run: npm run seed:v2');
  }

  const totalLessons = allLessons.length;

  // Find the default next lesson (sequential fallback)
  const sequentialNext = allLessons.find(
    (l) => !completedKeys.has(`${l.moduleId}.${l.lessonId}`)
  );

  // If user has completed everything, return the last lesson as "all done"
  if (!sequentialNext) {
    const lastLesson = allLessons[allLessons.length - 1];
    return buildResult(lastLesson, totalLessons, true, true, 'all-complete');
  }

  // ── Adaptive logic ──────────────────────────────────────────────────────────

  const accuracy = progress.accuracy ?? 0;
  const topicStats = progress.topicStats ?? new Map();

  // Need at least a few answers before adapting
  const hasEnoughData = (progress.totalAnswered ?? 0) >= 4;

  if (!hasEnoughData) {
    // Not enough data yet — use sequential
    return buildResult(sequentialNext, totalLessons, false, false, 'sequential-cold-start');
  }

  const weakTopic = findWeakestTopic(topicStats);

  // ── Rule 1: Low accuracy → easier lesson on weak topic ────────────────────
  if (accuracy < 50 && weakTopic) {
    const easyLesson = allLessons.find(
      (l) =>
        !completedKeys.has(`${l.moduleId}.${l.lessonId}`) &&
        l.topic === weakTopic &&
        l.difficulty === 'easy'
    );
    if (easyLesson) {
      return buildResult(easyLesson, totalLessons, false, false, `reinforce-weak-topic:${weakTopic}`);
    }

    // No easy lesson for the weak topic? Try any uncompleted lesson on that topic
    const anyTopicLesson = allLessons.find(
      (l) =>
        !completedKeys.has(`${l.moduleId}.${l.lessonId}`) &&
        l.topic === weakTopic
    );
    if (anyTopicLesson) {
      return buildResult(anyTopicLesson, totalLessons, false, false, `reinforce-weak-topic-any:${weakTopic}`);
    }
  }

  // ── Rule 2: Medium accuracy → normal progression ──────────────────────────
  if (accuracy >= 50 && accuracy <= 80) {
    return buildResult(sequentialNext, totalLessons, false, false, 'normal-progression');
  }

  // ── Rule 3: High accuracy → skip ahead to harder content ──────────────────
  if (accuracy > 80) {
    const hardLesson = allLessons.find(
      (l) =>
        !completedKeys.has(`${l.moduleId}.${l.lessonId}`) &&
        l.difficulty === 'hard'
    );
    if (hardLesson) {
      return buildResult(hardLesson, totalLessons, false, false, 'skip-ahead-advanced');
    }

    // No hard lessons available? Try medium
    const medLesson = allLessons.find(
      (l) =>
        !completedKeys.has(`${l.moduleId}.${l.lessonId}`) &&
        l.difficulty === 'medium'
    );
    if (medLesson) {
      return buildResult(medLesson, totalLessons, false, false, 'skip-ahead-medium');
    }
  }

  // ── Fallback: sequential ──────────────────────────────────────────────────
  return buildResult(sequentialNext, totalLessons, false, false, 'sequential-fallback');
}
