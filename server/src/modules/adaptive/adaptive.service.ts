import { QuestionBankModel, IQuestionBank } from '../../models/QuestionBank';
import { UserModel, ITopicAccuracy } from '../../models/User';
import { BattleQuestionRuntime, AnswerRecord } from '../battle/battle.types';
import { BattlePlayerState } from '../battle/battle.types';
import logger from '../../utils/logger';

/* ── Adaptive Question Selection ── */

/**
 * Select an adaptive set of questions for a battle between two players.
 *
 * Algorithm:
 * 1. Compute common topics between players
 * 2. Determine difficulty based on combined accuracy
 * 3. Allocate: 60% common topics, 20% P1 weak areas, 20% P2 weak areas
 * 4. Deduplicate and shuffle
 */
export async function selectAdaptiveQuestions(
  player1Id: string,
  player2Id: string,
  totalQuestions: number = 10
): Promise<IQuestionBank[]> {
  const [profile1, profile2] = await Promise.all([
    getUserTopicProfile(player1Id),
    getUserTopicProfile(player2Id),
  ]);

  // Get all available topics from question bank
  const allTopics = await QuestionBankModel.distinct('topic', { isActive: true });

  // Compute common topics
  const p1Topics = new Set(profile1.topics);
  const p2Topics = new Set(profile2.topics);
  let commonTopics = allTopics.filter((t) => p1Topics.has(t) && p2Topics.has(t));

  // If no common topics, use all available topics
  if (commonTopics.length === 0) {
    commonTopics = allTopics;
  }

  // Determine target difficulty based on combined accuracy
  const avgAccuracy = (profile1.avgAccuracy + profile2.avgAccuracy) / 2;
  const targetDifficulty = avgAccuracy > 75 ? 'hard' : avgAccuracy > 50 ? 'medium' : 'easy';

  // Allocate question counts
  const commonCount = Math.ceil(totalQuestions * 0.6);
  const p1WeakCount = Math.floor(totalQuestions * 0.2);
  const p2WeakCount = totalQuestions - commonCount - p1WeakCount;

  // Fetch questions
  const [commonQuestions, p1WeakQuestions, p2WeakQuestions] = await Promise.all([
    fetchRandomQuestions(commonTopics, targetDifficulty, commonCount),
    fetchRandomQuestions(
      profile1.weakTopics.length > 0 ? profile1.weakTopics : commonTopics,
      targetDifficulty,
      p1WeakCount
    ),
    fetchRandomQuestions(
      profile2.weakTopics.length > 0 ? profile2.weakTopics : commonTopics,
      targetDifficulty,
      p2WeakCount
    ),
  ]);

  // Combine and deduplicate
  const questionMap = new Map<string, IQuestionBank>();
  for (const q of [...commonQuestions, ...p1WeakQuestions, ...p2WeakQuestions]) {
    questionMap.set(q.id, q);
  }

  let questions = Array.from(questionMap.values());

  // If we don't have enough, fetch more from any topic
  if (questions.length < totalQuestions) {
    const existingIds = questions.map((q) => q._id);
    const additional = await QuestionBankModel.aggregate([
      { $match: { isActive: true, _id: { $nin: existingIds } } },
      { $sample: { size: totalQuestions - questions.length } },
    ]);
    questions = [...questions, ...additional];
  }

  // Trim to exact count and shuffle (Fisher-Yates)
  questions = questions.slice(0, totalQuestions);
  shuffleArray(questions);

  logger.debug(
    {
      totalSelected: questions.length,
      targetDifficulty,
      commonTopics: commonTopics.length,
      p1Weak: profile1.weakTopics,
      p2Weak: profile2.weakTopics,
    },
    'Adaptive questions selected'
  );

  return questions;
}

/* ── Helpers ── */

async function getUserTopicProfile(userId: string): Promise<{
  topics: string[];
  weakTopics: string[];
  strongTopics: string[];
  avgAccuracy: number;
}> {
  const user = await UserModel.findById(userId).select('learningProfile').lean();

  if (!user?.learningProfile?.topicAccuracy) {
    return { topics: [], weakTopics: [], strongTopics: [], avgAccuracy: 50 };
  }

  const topicAccuracy = user.learningProfile.topicAccuracy as unknown as Record<string, ITopicAccuracy>;
  const topics = Object.keys(topicAccuracy);

  let totalCorrect = 0;
  let totalAttempts = 0;
  const weakTopics: string[] = [];
  const strongTopics: string[] = [];

  for (const [topic, stats] of Object.entries(topicAccuracy)) {
    if (!stats || stats.total === 0) continue;
    const accuracy = (stats.correct / stats.total) * 100;
    totalCorrect += stats.correct;
    totalAttempts += stats.total;

    if (accuracy < 50 && stats.total >= 3) weakTopics.push(topic);
    if (accuracy >= 75 && stats.total >= 3) strongTopics.push(topic);
  }

  const avgAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 50;

  return { topics, weakTopics, strongTopics, avgAccuracy };
}

async function fetchRandomQuestions(
  topics: string[],
  difficulty: string,
  count: number
): Promise<IQuestionBank[]> {
  if (count <= 0 || topics.length === 0) return [];

  // Try exact difficulty first
  let questions = await QuestionBankModel.aggregate([
    { $match: { topic: { $in: topics }, difficulty, isActive: true } },
    { $sample: { size: count } },
  ]);

  // Fallback: any difficulty from these topics
  if (questions.length < count) {
    const existingIds = questions.map((q: any) => q._id);
    const additional = await QuestionBankModel.aggregate([
      { $match: { topic: { $in: topics }, isActive: true, _id: { $nin: existingIds } } },
      { $sample: { size: count - questions.length } },
    ]);
    questions = [...questions, ...additional];
  }

  return questions;
}

function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/* ── Update Question Stats (post-battle) ── */

export async function updateQuestionStats(
  questions: BattleQuestionRuntime[],
  players: BattlePlayerState[]
): Promise<void> {
  try {
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const answers = players.flatMap((p) => p.answers.filter((a) => a.questionIndex === i));

      if (answers.length === 0) continue;

      const correctCount = answers.filter((a) => a.isCorrect).length;
      const avgResponseTime =
        answers.reduce((sum, a) => sum + a.responseTimeMs, 0) / answers.length;

      // Update using running average
      await QuestionBankModel.findByIdAndUpdate(question.questionId, {
        $inc: { timesUsed: 1 },
        $set: {
          // Exponential moving average for correct rate
          avgCorrectRate: correctCount / answers.length,
          avgResponseTimeMs: avgResponseTime,
        },
      });
    }
  } catch (err) {
    logger.error({ err }, 'Failed to update question stats');
  }
}
