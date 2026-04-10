import dayjs from 'dayjs';

import { ProgressModel, IProgressDocument } from '../../models/Progress';
import { WalletModel } from '../../models/Wallet';
import { HoldingModel, StockModel } from '../../models/Stock';
import { UserModel } from '../../models/User';
import { achievementTemplates } from '../../data/achievements';

const ensureAchievementSlots = (progress: IProgressDocument | null) => {
  if (!progress) return;

  // Repair existing entries that were saved with `achievementId` instead of `id`
  for (const achievement of progress.achievements as any[]) {
    if (!achievement.id && achievement.achievementId) {
      achievement.id = achievement.achievementId;
      delete achievement.achievementId;
    }
  }

  // Remove entries that still have no `id` (completely broken)
  progress.achievements = progress.achievements.filter((a) => !!a.id);

  // Add any missing achievement slots
  achievementTemplates.forEach((template) => {
    const exists = progress.achievements.find((a) => a.id === template.id);
    if (!exists) {
      progress.achievements.push({
        ...template,
        unlocked: false,
        progress: 0
      });
    }
  });
};

export const evaluateAchievements = async (userId: string) => {
  const [progress, wallet, holdings, user, stocks] = await Promise.all([
    ProgressModel.findOne({ user: userId }),
    WalletModel.findOne({ user: userId }),
    HoldingModel.find({ user: userId }),
    UserModel.findById(userId),
    StockModel.find({})
  ]);

  if (!progress || !user) {
    return [];
  }

  ensureAchievementSlots(progress);

  const updateAchievement = (id: string, unlocked: boolean, progressValue = 0) => {
    const target = progress.achievements.find((a) => a.id === id);
    if (!target) return;
    target.progress = progressValue;
    if (unlocked && !target.unlocked) {
      target.unlocked = true;
      target.unlockedAt = new Date();
    }
  };

  // First Steps
  updateAchievement('first-steps', progress.completedLessons.length >= 1);

  // Quiz master: 5 quizzes >=80%
  const highScores = progress.quizScores.filter((qs) => qs.score / qs.total >= 0.8).length;
  updateAchievement('quiz-master', highScores >= 5, Math.min(highScores, 5));

  // Early investor
  updateAchievement('early-investor', holdings.length >= 1);

  // Streak warrior
  updateAchievement('streak-warrior', user.currentStreak >= 7, Math.min(user.currentStreak, 7));

  // Money master
  updateAchievement('money-master', progress.completedModules.length >= 5, progress.completedModules.length);

  // Diversification
  const uniqueSymbols = new Set(holdings.map((h) => h.symbol)).size;
  updateAchievement('diversification-pro', uniqueSymbols >= 5, uniqueSymbols);

  // Quiz champion: perfect quizzes
  const perfectQuizzes = progress.quizScores.filter((qs) => qs.score === qs.total).length;
  updateAchievement('quiz-champion', perfectQuizzes >= 10, Math.min(perfectQuizzes, 10));

  // Trading tycoon: profit >=1000
  let totalProfit = 0;
  holdings.forEach((holding) => {
    const stock = stocks.find((s) => s.symbol === holding.symbol);
    if (stock) {
      totalProfit += (stock.price - holding.avgCost) * holding.shares;
    }
  });
  updateAchievement('trading-tycoon', totalProfit >= 1000, Math.min(totalProfit, 1000));

  // Battle victor - placeholder progress
  updateAchievement('battle-victor', false, 0);

  await progress.save();
  return progress.achievements;
};

export const getAchievements = async (userId: string) => {
  const progress = await ProgressModel.findOne({ user: userId });
  if (!progress) return [];
  ensureAchievementSlots(progress);
  await progress.save();
  return progress.achievements;
};

