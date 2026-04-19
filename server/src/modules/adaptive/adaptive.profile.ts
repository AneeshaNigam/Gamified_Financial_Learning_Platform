import { UserModel, ITopicAccuracy } from '../../models/User';
import { BattleQuestionRuntime, AnswerRecord } from '../battle/battle.types';
import logger from '../../utils/logger';

/**
 * Update a user's learning profile after a battle.
 * Tracks per-topic accuracy, response times, and identifies strong/weak areas.
 */
export async function updateLearningProfile(
  userId: string,
  answers: AnswerRecord[],
  questions: BattleQuestionRuntime[]
): Promise<void> {
  try {
    const user = await UserModel.findById(userId).select('learningProfile');
    if (!user) return;

    // Initialize if needed
    if (!user.learningProfile) {
      user.learningProfile = {
        topicAccuracy: new Map(),
        strongTopics: [],
        weakTopics: [],
        lastUpdated: new Date(),
      };
    }

    const topicAccuracy = user.learningProfile.topicAccuracy instanceof Map
      ? user.learningProfile.topicAccuracy
      : new Map(Object.entries(user.learningProfile.topicAccuracy || {}));

    // Process each answer
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const question = questions[answer.questionIndex];
      if (!question) continue;

      const topic = question.topic;
      const raw = topicAccuracy.get(topic);
      const existing: ITopicAccuracy = (raw && typeof raw === 'object' && 'correct' in raw)
        ? raw as ITopicAccuracy
        : { correct: 0, total: 0, avgResponseTimeMs: 0 };

      existing.total += 1;
      if (answer.isCorrect) existing.correct += 1;

      // Running average for response time
      if (answer.selectedOption !== null) {
        existing.avgResponseTimeMs =
          (existing.avgResponseTimeMs * (existing.total - 1) + answer.responseTimeMs) /
          existing.total;
      }

      topicAccuracy.set(topic, existing);
    }

    // Recompute strong and weak topics
    const strongTopics: string[] = [];
    const weakTopics: string[] = [];

    topicAccuracy.forEach((rawStats: unknown, topic: string) => {
      const stats = rawStats as ITopicAccuracy;
      if (!stats || stats.total < 3) return; // Need minimum data
      const accuracy = (stats.correct / stats.total) * 100;
      if (accuracy >= 75) strongTopics.push(topic);
      if (accuracy < 50) weakTopics.push(topic);
    });

    // Update in database
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          'learningProfile.topicAccuracy': Object.fromEntries(topicAccuracy),
          'learningProfile.strongTopics': strongTopics,
          'learningProfile.weakTopics': weakTopics,
          'learningProfile.lastUpdated': new Date(),
        },
      }
    );

    logger.debug(
      { userId, strongTopics, weakTopics, topicCount: topicAccuracy.size },
      'Learning profile updated'
    );
  } catch (err) {
    logger.error({ err, userId }, 'Failed to update learning profile');
  }
}
