# Frontend Contract Snapshot

This document captures the data the current MoneyMaster frontend expects from the backend. It is derived from the React contexts (`src/contexts/*.tsx`) and key pages under `src/pages`.

## Auth (`AuthContext`)
- User shape: `{ id, name, email, age, grade, school, level, xp, knowledgeLevel, currentStreak, longestStreak, createdAt, lastLogin }`.
- Required flows:
  - `POST /api/auth/signup` to create a user with password, return auth token + profile.
  - `POST /api/auth/login` returning auth token + profile, update streak + `lastLogin`.
  - `POST /api/auth/logout` (optional server-side token invalidation).
  - `GET /api/auth/me` for session bootstrap.
  - `PATCH /api/users/:id` for profile edits and `addXP` (level = `floor(xp / 250) + 1`).

## Wallet (`WalletContext`)
- Wallet data: `{ lucreBalance, activeBalance, discretionaryBalance, totalEarned, lastPayout, expenses { tax, rent, food, utilities, other } }`.
- Transaction model: `{ id, date, type, description, amount, balance }`.
- Required operations:
  - `GET /api/wallet` to fetch wallet + recent transactions.
  - `POST /api/wallet/earn` to add lucre & total earned.
  - `POST /api/wallet/discretionary/deduct` and `/add` to move active funds.
  - `POST /api/wallet/payout` weekly salary transfer (lucre → active/discretionary).
  - `PUT /api/wallet/expenses` to update allocation.

## Stocks (`StockContext`, `pages/Stocks`, `StockDetail`)
- Stock shape: `{ symbol, name, price, change, changePercent, history[], icon, description, sector }`.
- Holding: `{ symbol, shares, avgCost }`.
- Trade: `{ id, date, symbol, type, shares, price }`.
- Required endpoints:
  - `GET /api/stocks` for live prices (with backend-driven simulation).
  - `GET /api/stocks/:symbol` for detail view.
  - `POST /api/stocks/:symbol/buy` and `/sell` adjust wallet discretionary balance accordingly and emit trades.
  - `GET /api/stocks/portfolio` returning holdings, trades, portfolio value, total profit.

## Progress & Learning (`ProgressContext`, `pages/Learning`, `Lesson`, `Quiz`)
- Progress data: `{ currentModule, completedModules[], completedLessons[], quizScores<Record<quizId, { score, total, date, timeSpent }>>, achievements[] }`.
- Achievements have `{ id, name, description, icon, xpReward, unlocked, unlockedAt?, progress?, total? }`.
- Lesson flow:
  - `GET /api/modules` returns module metadata + lessons (ids, durations, XP).
  - `GET /api/lessons/:moduleId/:lessonId` returns slide content.
  - `POST /api/lessons/:moduleId/:lessonId/complete` grants XP + lucre payout.
- Quiz flow:
  - `GET /api/quizzes/:moduleId` returns quiz questions & metadata.
  - `POST /api/quizzes/:moduleId/submit` to record `score`, `timeSpent`, award XP/lucre, update module completion, and check achievements.
- Achievements flow:
  - `GET /api/achievements` returns unlocked + progress.
  - `POST /api/achievements/check` recalculates derived achievements (quiz master, diversification, etc.).

## Leaderboard (`pages/Leaderboard`)
- Needs aggregated data: top learners with `{ rank, name, school, level, xp, streak, profit }` plus the authenticated user’s standing.
- Endpoints:
  - `GET /api/leaderboard?limit=50` to fetch top entries.
  - `GET /api/leaderboard/me` returns user rank + stats.

## Derived Behaviors to Support
- XP + level progression is tied to lesson/quiz completion and achievements.
- Wallet payouts weekly; achievements triggered by wallet, quiz, and stock milestones.
- Stock prices need periodic simulation (cron or interval) to keep UI lively.

This contract should remain aligned with frontend types so contexts can transition from `localStorage` to live API responses without structural changes.

