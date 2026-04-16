# MoneyMaster Backend API

All endpoints are prefixed with `/api`. Authentication uses JWT Bearer tokens returned by `/api/auth/login` and `/api/auth/signup`.

## Auth
- `POST /auth/signup` – create account. Body: `{ name, email, password, age?, grade?, school? }`.
- `POST /auth/login` – login with `{ email, password }`. Returns `{ token, user }`.
- `GET /auth/me` – fetch current profile.
- `PATCH /auth/me` – update profile fields.
- `POST /auth/xp` – body `{ amount }`, increments XP/level (used when the app awards XP directly).
- `POST /auth/logout` – stateless acknowledgement.

## Learning & Progress
- `GET /learning/modules` – returns module metadata plus user progress.
- `GET /learning/progress` – raw progress document.
- `GET /learning/lessons/:moduleId/:lessonId` – lesson content slides.
- `POST /learning/lessons/:moduleId/:lessonId/complete` – marks lesson complete, grants `50 XP` + `₹30` lucre.
- `GET /learning/quizzes/:moduleId` – quiz questions for a module.
- `POST /learning/quizzes/:moduleId/submit` – body `{ answers: number[], timeSpent }`. Grades quiz, awards XP (`score * 10`) + lucre (`floor(percentage)`), unlocks modules, triggers achievements.

## Wallet
- `GET /wallet` – wallet summary + last 50 transactions.
- `POST /wallet/earn` – body `{ amount, description }`, adds lucre.
- `POST /wallet/discretionary/add` – body `{ amount, description }`, credits discretionary balance.
- `POST /wallet/discretionary/deduct` – body `{ amount, description }`, debits discretionary balance.
- `POST /wallet/payout` – transfers lucre → active/discretionary balances.
- `PUT /wallet/expenses` – body `{ tax, rent, food, utilities, other }`, updates allocations.

## Stocks
- `GET /stocks` – market data (symbol, price, change, history, etc).
- `GET /stocks/portfolio` – holdings, trades, portfolio value, total profit.
- `POST /stocks/:symbol/buy` – `{ shares }`, deducts discretionary funds, updates holdings/trades.
- `POST /stocks/:symbol/sell` – `{ shares }`, credits discretionary funds.
- `POST /stocks/refresh` – (auth required) randomizes prices to simulate live ticker.

## Achievements
- `GET /achievements` – current achievement states.
- `POST /achievements/check` – force re-evaluation (usually called after lessons/quizzes/trades).

## Leaderboard
- `GET /leaderboard?limit=20` – top learners by XP (includes level, school, streak, profit).
- `GET /leaderboard/me` – authenticated user’s standing.

## Utility
- `GET /health` – health check (no auth).

### Notes
- Monetary values are in INR.
- Most write endpoints trigger achievement recalculation on the server; the frontend should re-fetch `/achievements` after significant actions to update UI badges.
- Stock data is persisted in MongoDB; run `npm run seed` once (after setting `MONGODB_URI`) to populate the catalog.

