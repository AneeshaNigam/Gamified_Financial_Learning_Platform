# MoneyMaster — Server Conventions

This file contains server-specific instructions. See the root `CLAUDE.md` for project-wide context.

## Folder Structure

```
server/src/
├── app.ts                  # Express app setup (middleware, routes)
├── server.ts               # HTTP server bootstrap + Socket.io init
├── index.ts                # Entry point (connects DB, starts server)
├── config/
│   ├── env.ts              # Zod-validated environment variables
│   ├── database.ts         # MongoDB connection
│   ├── passport.ts         # Google OAuth strategy
│   ├── redis.ts            # ioredis client + pub/sub clients for Socket.io adapter
│   └── socket.ts           # Socket.io server init, Redis adapter, emitToUser/emitToBattle helpers
├── middleware/
│   ├── auth.ts             # JWT authenticate middleware
│   ├── validate.ts         # Zod validation middleware
│   ├── errorHandler.ts     # Global error handler + 404
│   └── socketAuth.ts       # JWT auth middleware for Socket.io connections
├── models/                 # Mongoose schemas & models
│   ├── User.ts             # User: auth, XP, streaks, ELO, battleStats, learningProfile, presenceStatus
│   ├── Module.ts           # Learning modules
│   ├── Lesson.ts           # Lessons within modules (legacy slide-based)
│   ├── LessonV2.ts         # Dynamic step-based lessons (info + MCQ)
│   ├── Quiz.ts             # Quizzes per module
│   ├── Progress.ts         # User learning progress & achievements
│   ├── Wallet.ts           # Virtual currency wallet
│   ├── Stock.ts            # Simulated stock data
│   ├── Achievement.ts      # Achievement definitions
│   ├── Testimonial.ts      # User testimonials
│   ├── Battle.ts           # Persisted battle record (players, questions, answers, ELO)
│   ├── BattleRoom.ts       # Private room (6-char code, TTL expiry, status lifecycle)
│   ├── QuestionBank.ts     # Financial literacy MCQ question bank
│   └── RatingHistory.ts    # ELO change log per player per battle
├── modules/                # Feature modules
│   ├── auth/
│   ├── learning/           # Legacy, adaptive V2 engine, and telemetry
│   ├── wallet/
│   ├── stocks/
│   ├── achievements/
│   ├── leaderboard/
│   ├── testimonials/
│   ├── battle/             # Battle engine, REST routes, Socket.io handlers
│   │   ├── battle.controller.ts   # History, detail, analytics, leaderboard
│   │   ├── battle.service.ts      # Battle queries and post-battle updates
│   │   ├── battle.engine.ts       # In-memory BattleEngine class (timers, scoring, lifecycle)
│   │   ├── battle.routes.ts       # REST routes
│   │   ├── battle.schema.ts       # Zod schemas
│   │   ├── battle.socket.ts       # Socket.io: answer_submit, forfeit, battle_ready
│   │   └── battle.types.ts        # Shared battle types & SCORE_CONFIG
│   ├── matchmaking/        # Queue management, algorithm, loop
│   │   ├── matchmaking.service.ts # addToQueue, removeFromQueue, matchmaking loop
│   │   ├── matchmaking.socket.ts  # queue_join / queue_leave socket handlers
│   │   └── matchmaking.types.ts   # Queue entry types, MATCHMAKING_CONFIG, mode configs
│   ├── room/               # Private room (REST + socket)
│   │   ├── room.controller.ts     # Create / join room controllers
│   │   ├── room.service.ts        # Room logic, battle initiation
│   │   ├── room.schema.ts         # Zod schemas
│   │   └── room.socket.ts         # room_join socket handler
│   ├── rating/             # ELO calculation and history
│   │   ├── rating.service.ts      # calculateEloChanges(), getUserRatingHistory()
│   │   ├── rating.controller.ts   # GET /rating/history
│   │   └── rating.routes.ts
│   ├── presence/           # User presence (online/idle/in-battle/offline)
│   │   ├── presence.service.ts    # updatePresence(), setUserOffline()
│   │   └── presence.socket.ts     # heartbeat socket handler
│   ├── anticheat/          # Anti-cheat layer for battle answers
│   │   ├── anticheat.service.ts   # Rate limiting, answer lock, tab-switch, bot detection
│   │   └── anticheat.middleware.ts # applyAntiCheatMiddleware() for socket interceptor
│   └── adaptive/           # Adaptive question selection + LLM generation
│       ├── adaptive.service.ts    # selectAdaptiveQuestions(), updateQuestionStats()
│       ├── adaptive.profile.ts    # User topic-profile helpers
│       └── adaptive.llm.ts        # OpenAI GPT-4o-mini question generation (optional)
├── routes/
│   └── index.ts            # Central router (/api prefix)
├── data/                   # Seed data files
├── scripts/                # Database seeding scripts
│   ├── seed.ts             # Legacy learning content
│   ├── seedAll.ts          # All seed data
│   ├── seedLessonsV2.ts    # V2 dynamic step-based lessons
│   ├── seedAchievements.ts
│   ├── seedLessons.ts
│   ├── seedModules.ts
│   ├── seedQuizzes.ts
│   ├── seedQuestionBank.ts # Question bank for battle system (financial literacy MCQs)
│   └── seedTestimonials.ts
├── types/
│   └── express.d.ts        # Express Request.user augmentation
└── utils/
    ├── ApiError.ts          # Custom error class (statusCode + details)
    ├── asyncHandler.ts      # Async/await Express wrapper
    ├── response.ts          # sendSuccess() helper
    ├── email.service.ts     # Brevo HTTP API email service
    ├── logger.ts            # Pino logger
    └── gamification.ts      # XP/level calculation
```

## Coding Conventions

### Module Pattern

Every feature lives in `modules/<feature>/` with exactly these files:
- `<feature>.controller.ts` — route handlers, always wrapped in `asyncHandler`
- `<feature>.service.ts` — business logic (no Express types here)
- `<feature>.routes.ts` — Express Router, applies `authenticate` and `validate` middleware
- `<feature>.schema.ts` — Zod schemas for request validation
- `<feature>.socket.ts` — Socket.io event handlers (battle system modules only)

### Error Handling

- Throw `ApiError(statusCode, message)` for known errors
- The global `errorHandler` middleware in `middleware/errorHandler.ts` catches everything
- Never use `try/catch` in controllers — `asyncHandler` handles this

### Validation

- Use `validate(schema)` middleware in route definitions
- The middleware parses `req.body` (default), `req.query`, or `req.params`
- All schemas defined in `<feature>.schema.ts` using Zod v4

### Response Format

Always use `sendSuccess(res, data, message?, statusCode?)`:
```json
{ "status": "success", "data": { ... }, "message": "..." }
```

### Model Naming

- Mongoose models: PascalCase with `Model` suffix — `UserModel`, `WalletModel`, `BattleModel`, `QuestionBankModel`
- Interfaces: `I` prefix — `IUser`, `IUserDocument`, `IBattle`, `IQuestionBank`
- Schema fields with sensitive data use `select: false`

### Authentication

- Use `authenticate` middleware on protected routes
- Access user via `req.user` (typed as `IUserDocument` in `types/express.d.ts`)
- JWT signed with `env.JWT_SECRET`, default expiry `7d`
- Socket.io: use `socketAuthMiddleware` — attaches `socket.userId` and `socket.userName`

### Password Security

- bcrypt with 10 salt rounds for password hashing
- SHA-256 for OTP and reset token hashing
- Sensitive fields (`password`, `loginOtp`, etc.) use `select: false`

### Environment Variables

- All env vars validated at startup via Zod in `config/env.ts`
- Access via `env.VAR_NAME` — never use `process.env` directly
- See root `CLAUDE.md` for full variable list

### Logging

- Use the Pino logger from `utils/logger.ts`
- Never use `console.log` — always `logger.info()`, `logger.error()`, etc.

### Email

- Use Brevo HTTP API via `utils/email.service.ts`
- Never use SMTP — Render blocks outbound SMTP ports
- Email templates are inline HTML strings in the service

## Auth Flow Details

1. **Signup**: Credentials → in-memory OTP (Map, 10-min TTL, cleaned every 5 min) → verify → create user → JWT
2. **Login**: Credentials → OTP stored on User document (`loginOtp`, `loginOtpExpires`, 10-min TTL) → verify → JWT
3. **Google OAuth**: Passport strategy → creates/links user → redirects to client with JWT in URL query
4. **Forgot Password**: Email → SHA-256 hashed reset token on User doc (10-min expiry) → email link → reset

## Learner Analytics & Adaptive Lesson Engine (V2)

The V2 lesson system is an adaptive, server-driven step engine that replaces hardcoded client slides.

### Models: `LessonV2` & `Progress`

- `LessonV2` includes `topic` and `difficulty` metadata for adaptive recommendations.
- `Progress` captures detailed Learner Analytics: XP, accuracy, response times (`timeTaken`), and topic-specific performance statistics.
- `order`, `moduleId`, `lessonId`, `xpReward`, `lucreReward` are kept for sequence tracking and gamification rewards.
- `steps[]` — array of `IInfoStep` or `IMcqStep` (discriminated union on `type`)

### Step Types

- **info**: Read-only content card. Awards `xp` on view.
- **mcq**: Multiple-choice question with `correctAnswer` and `explanation`. Tracks telemetry (`timeTaken`). Awards full `xp` if correct, partial (25%) if wrong.

### API Flow

1. `GET /api/learning/current` — `adaptive.service.ts` dynamically recommends the next lesson based on user accuracy and past topic performance (strips correct answers).
2. `POST /api/learning/submit` — evaluates MCQ answer, processes `timeTaken` telemetry, updates Learner Analytics, awards XP, returns feedback.
3. `POST /api/learning/complete` — marks lesson done, awards bonus rewards, triggers adaptive logic for next lesson.

### Seeding

```bash
npm run seed:v2   # Runs scripts/seedLessonsV2.ts — clears and re-seeds all V2 lessons
```

### Important Rules

- Never send `correctAnswer` or `explanation` to the client before the user submits an answer
- Legacy routes (`/lessons/:moduleId/:lessonId`) are preserved for backward compatibility
- New lessons should use the V2 model, not the legacy `Lesson` model

## Real-Time Quiz Battle System

### Server Bootstrap (`server.ts`)

Socket.io is initialized after the HTTP server is created:
```ts
const io = initializeSocketServer(server);
registerPresenceHandlers(io);    // heartbeat → presence status
registerMatchmakingHandlers(io); // queue_join / queue_leave
registerRoomHandlers(io);        // room_join for private rooms
registerSocketHandlers(io);      // answer_submit, forfeit, battle_ready
```

### Redis Usage

- `matchmaking:queue` — sorted set (score = ELO × 1000 + level) for the matchmaking queue
- `matchmaking:meta:<userId>` — hash of queue entry metadata (2-min TTL)
- `matchmaking:active` — set of userIds currently being matched (prevents double-matching)
- `anticheat:rate:<userId>` — 500ms NX key for answer rate limiting
- `anticheat:answer:<roomId>:q<n>:u<userId>` — SETNX lock for answer replay prevention
- `anticheat:tabswitch:<battleId>:<userId>` — list of tab-switch timestamps (1hr TTL)
- Redis pub/sub (`getRedisPubSub()`) — Socket.io Redis adapter for cross-instance socket rooms

### Matchmaking Algorithm

1. Tick every 2 seconds (`MATCHMAKING_CONFIG.TICK_INTERVAL_MS`)
2. For each unmatched queue entry, compute `computeMatchScore()` against all candidates in the same mode
3. Scoring factors: level proximity, knowledge tier match, XP ratio, ELO difference — all weighted by mode config
4. Time-based relaxation: skill window expands every 5s after the strict period
5. On match: remove from queue → `sadd` to active set → `createMatchedBattle()` → emit `match_found` to both
6. Max queue time: 2 minutes → `queue_timeout` emitted then removed

### ELO Rating

- Starting rating: 1200 (default for all new users)
- K-factor: 40 (< 30 battles), 32 (standard), 16 (≥ 2400 rating)
- Mode multipliers: Ranked = 1.0×, Quick Match = 0.5×, Private Room = 0.25×
- Floor: 100 (defined by `SCORE_CONFIG.MIN_RATING`)
- Rating history persisted to `RatingHistory` collection

### Anti-Cheat

Applied via `applyAntiCheatMiddleware(socket)` on each authenticated socket:
- **Rate limit**: Max 1 answer per 500ms per user (Redis NX key)
- **Replay prevention**: SETNX lock per `roomId:question:userId` — first write wins, duplicates rejected
- **Tab switch tracking**: `visibility_change` events recorded to Redis list for analytics
- **Bot detection** (`analyzeBotPatterns()`): checks response time variance (< 50ms std dev) and speed (> 50% answers < 200ms); returns suspicion score 0–1 with flag list

### Battle Engine (`battle.engine.ts`)

- Instantiated in-memory per battle during `createMatchedBattle()`
- Manages question timer (15s default per question), sends next question on timer expiry or when both players have answered
- Tracks `BattlePlayerState` per player: score, answers, response times
- On completion: calls `battle.service.ts` to persist results, update user stats, trigger ELO calculation

### Private Rooms (`room/`)

- `POST /api/battle/rooms` — create room (generates 6-char uppercase code, 5-min TTL via MongoDB TTL index)
- `POST /api/battle/rooms/join` — join by code (REST)
- `room_join` socket event — player signals ready; when both ready, battle starts
- Room status lifecycle: `waiting` → `ready` → `started` → `expired`

### Adaptive Questions for Battles

`selectAdaptiveQuestions(player1Id, player2Id, 10)`:
1. Loads each player's `learningProfile.topicAccuracy` from `User` model
2. Computes common topics → determines target difficulty from combined accuracy (>75% → hard, >50% → medium, else easy)
3. Fetches: 60% from common topics, 20% from P1 weak topics, 20% from P2 weak topics
4. Deduplicates, shuffles (Fisher-Yates), pads from any topic if needed

### Question Bank Seeding

```bash
npm run seed:questions  # Runs scripts/seedQuestionBank.ts
```

Questions have topic (e.g., `budgeting`, `investing`, `savings`), difficulty (`easy|medium|hard`), options, correctAnswer, and per-use stats (timesUsed, avgCorrectRate, avgResponseTimeMs).
