# MoneyMaster — Project Guide

A gamified financial literacy learning platform for young learners (ages 5–25). Users progress through structured learning modules, earn XP, manage a virtual wallet, trade simulated stocks, unlock achievements, compete on leaderboards, and challenge each other in real-time Quiz Battles.

## Architecture

Monorepo with two independent apps:

```
Capstone/
├── client/          # React SPA (Vite + TypeScript) → deployed on Vercel
├── server/          # Express REST API + Socket.io (TypeScript) → deployed on Render
├── CLAUDE.md        # This file — project-wide instructions
├── client/CLAUDE.md # Client-specific conventions
└── server/CLAUDE.md # Server-specific conventions
```

- **Database**: MongoDB Atlas (Mongoose ODM)
- **Cache / Pub-Sub**: Redis (ioredis) — required for matchmaking queue, Socket.io adapter, and anti-cheat
- **Real-time**: Socket.io with Redis adapter for horizontal scaling
- **Communication**: REST over HTTPS + WebSocket (Socket.io), JWT Bearer auth, JSON request/response

## Tech Stack (Summary)

- **Server**: Node.js, TypeScript, Express 5, Mongoose 8, Zod v4, JWT + Passport (Google OAuth), Brevo HTTP API, Pino logger, Socket.io 4, ioredis, OpenAI API (optional)
- **Client**: React 18, TypeScript, Vite 5, Tailwind CSS 3 + shadcn/ui, TanStack React Query v5, React Router v6, React Hook Form + Zod v3, Recharts, Socket.io-client

## Core Conventions

### Response Format (Server)

```json
{ "status": "success", "data": { ... }, "message": "..." }
{ "status": "error", "message": "..." }
```

### Module Pattern (Server)

Each feature in `server/src/modules/<feature>/` has:
- `<feature>.controller.ts` — route handlers (wrapped in `asyncHandler`)
- `<feature>.service.ts` — business logic
- `<feature>.routes.ts` — Express Router with middleware
- `<feature>.schema.ts` — Zod validation schemas
- `<feature>.socket.ts` — Socket.io event handlers (battle system modules only)

### Error Handling

- Throw `ApiError(statusCode, message)` — caught by global `errorHandler`
- Use `validate(schema)` middleware for Zod validation in routes
- Use `asyncHandler` wrapper for all async controller functions

### Authentication

- JWT Bearer token via `authenticate` middleware on protected routes
- Access user via `req.user` (typed as `IUserDocument`)
- OTP-based auth: signup/login → email OTP → verify → receive JWT
- Google OAuth via Passport → redirects to client with JWT in URL query
- Token stored in `localStorage` (key: `auth_token`)
- Socket.io connections authenticated via `socketAuth` middleware (JWT in handshake `auth.token`)

### Client Patterns

- Path alias: `@/` → `client/src/`
- UI: shadcn/ui components from `@/components/ui/`
- State: React Context (Auth, Wallet, Progress, Battle, Socket) + TanStack Query for server state
- API calls: Use `api` object from `@/services/api.ts` (tokens auto-injected)
- Real-time: Use `SocketContext.tsx` for Socket.io — `BattleContext.tsx` for battle state management
- Theme: Dark/light/system via `next-themes` (key: `moneymaster-theme`)
- Font: Nunito → Inter → system-ui → sans-serif

## Learner Analytics & Adaptive Lesson Engine (V2)

The platform uses an **adaptive, step-based lesson engine**:
- **Adaptive Recommendations**: Server dynamically recommends lessons based on user accuracy and past topic performance (via `adaptive.service.ts`).
- **LessonV2 Model**: Stores ordered `steps` (info cards + MCQ) with `topic` and `difficulty` metadata.
- **Behavior Tracking**: `Progress` model captures detailed telemetry: XP, accuracy, response times (`timeTaken`), and topic-specific performance statistics.
- The server drives all lesson flow — no hardcoded lesson data on the client.
- Steps award XP incrementally; MCQ answers give partial XP even if wrong, factoring in telemetry on submission.
- Legacy slide-based lesson routes are kept for backward compatibility.

## Real-Time Quiz Battle System

A full-stack, real-time 1v1 quiz battle system with ELO matchmaking and anti-cheat:

### Battle Modes
- **Quick Match** — skill-based matchmaking, half ELO impact
- **Ranked** — ELO-rated ladder matches, full ELO impact  
- **Private Room** — invite-only via 6-character room code, quarter ELO impact

### Architecture
- **Matchmaking**: Redis sorted-set queue with composite score (ELO × 1000 + level); skill-window relaxation over time; 2-minute max queue time; 2-second tick interval
- **Battle Engine**: In-memory `BattleEngine` class manages question timers, answer scoring, score tracking, and battle completion
- **ELO Rating**: Standard ELO formula with dynamic K-factor (K=40 new players, K=32 standard, K=16 elite ≥2400); mode-specific multipliers
- **Adaptive Questions**: `selectAdaptiveQuestions()` — 60% common topics + 20% P1 weak areas + 20% P2 weak areas; difficulty matched to combined player accuracy
- **Anti-Cheat**: Redis-backed rate limiting (1 answer per 500ms), answer replay prevention (SETNX lock per question per user), tab-switch event recording, bot-pattern heuristics (response time variance analysis)
- **Presence**: Real-time online/idle/in-battle/offline status via heartbeat system

### New Models
- **`Battle`** — Persisted battle record: players, questions, answers, scores, ELO before/after, winner, duration
- **`BattleRoom`** — Private room with 6-char code, TTL-based expiry (5 min), auto-deleted by MongoDB TTL index
- **`QuestionBank`** — Financial literacy MCQ bank: topic, difficulty, options, correctAnswer, explanation, usage stats
- **`RatingHistory`** — ELO change log per battle per player

### New User Fields
The `User` model now includes:
- `eloRating` (default: 1200) — ELO ranking
- `battleStats` — `{totalBattles, wins, losses, draws, winStreak, bestWinStreak, totalXpEarned}`
- `presenceStatus` — `'online' | 'idle' | 'in-battle' | 'offline'`
- `lastHeartbeat` — timestamp for presence tracking
- `activeBattleId` — current battle (prevents double-queuing)
- `learningProfile` — `{topicAccuracy, strongTopics, weakTopics}` for adaptive question selection

### LLM Question Generation (optional)
`adaptive.llm.ts` generates questions via OpenAI GPT-4o-mini when `OPENAI_API_KEY` is set. Validates output with Zod before persisting. `ensureQuestionPool()` triggers generation when a topic/difficulty falls below 20 questions.

## API Routes (All prefixed `/api`)

| Route | Auth | Description |
|---|---|---|
| **Auth** | | |
| `POST /api/auth/signup` | No | Start signup (sends OTP) |
| `POST /api/auth/login` | No | Start login (sends OTP) |
| `POST /api/auth/verify-otp` | No | Verify OTP and complete auth |
| `POST /api/auth/resend-otp` | No | Resend OTP |
| `GET /api/auth/me` | Yes | Get current user profile |
| `PATCH /api/auth/me` | Yes | Update profile |
| `POST /api/auth/xp` | Yes | Add XP to user |
| `POST /api/auth/forgot-password` | No | Send password reset email |
| `POST /api/auth/reset-password/:token` | No | Reset password with token |
| `POST /api/auth/change-password` | Yes | Change password (authenticated) |
| `GET /api/auth/google` | No | Initiate Google OAuth |
| `GET /api/auth/google/callback` | No | Google OAuth callback |
| **Learning (Legacy)** | | |
| `GET /api/learning/modules` | Yes | List modules with progress |
| `GET /api/learning/progress` | Yes | User learning progress |
| `GET /api/learning/lessons/:moduleId/:lessonId` | Yes | Get lesson content |
| `POST /api/learning/lessons/:moduleId/:lessonId/complete` | Yes | Mark lesson complete |
| `GET /api/learning/quizzes/:moduleId` | Yes | Get quiz for module |
| `POST /api/learning/quizzes/:moduleId/submit` | Yes | Submit quiz answers |
| **Learning (V2 Dynamic Engine)** | | |
| `GET /api/learning/current` | Yes | Get current (next uncompleted) lesson |
| `POST /api/learning/submit` | Yes | Submit MCQ step answer |
| `POST /api/learning/complete` | Yes | Mark V2 lesson complete, get next |
| **Battle System (REST)** | | |
| `GET /api/battle/history` | Yes | Battle history for current user |
| `GET /api/battle/analytics/me` | Yes | Personal battle analytics |
| `GET /api/battle/leaderboard` | No | Battle ELO leaderboard |
| `GET /api/battle/:battleId` | Yes | Single battle detail |
| `POST /api/battle/rooms` | Yes | Create private room |
| `POST /api/battle/rooms/join` | Yes | Join private room by code |
| `GET /api/battle/rating/history` | Yes | ELO rating history |
| **Other** | | |
| `* /api/wallet/*` | Yes | Virtual wallet operations |
| `* /api/stocks/*` | Yes | Stock market simulation |
| `* /api/achievements/*` | Yes | Achievement tracking |
| `GET /api/leaderboard/*` | Yes | Leaderboard data |
| `GET /api/testimonials/*` | Mixed | Testimonial data |
| `GET /health` | No | Health check endpoint |

## Socket.io Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `queue_join` | `{mode}` | Join matchmaking queue |
| `queue_leave` | — | Leave matchmaking queue |
| `battle_ready` | `{roomId}` | Signal ready after match found |
| `answer_submit` | `{roomId, questionIndex, selectedOption, responseTimeMs}` | Submit battle answer |
| `battle_forfeit` | `{roomId}` | Forfeit the battle |
| `visibility_change` | `{battleId, hidden}` | Tab switch tracking (anti-cheat) |
| `heartbeat` | — | Presence heartbeat |
| `room_join` | `{code}` | Join private room via code |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `queue_status` | `{position, estimatedWaitSeconds, inQueue}` | Queue position update |
| `queue_error` | `{message}` | Queue error (already in battle, etc.) |
| `queue_timeout` | `{reason}` | No match found within limit |
| `match_found` | `{roomId, battleId, opponent}` | Match created |
| `battle_start` | `{roomId, question, questionIndex, totalQuestions}` | Battle begins |
| `question_start` | `{question, questionIndex, timeLimit}` | Next question |
| `answer_ack` | `{accepted, questionIndex, reason?}` | Answer received confirmation |
| `score_update` | `{scores, lastAnswer}` | Score board after each answer |
| `battle_end` | `{winner, scores, xpGained, eloChanges}` | Battle complete |
| `opponent_disconnected` | — | Opponent left mid-battle |

## Environment Variables

### Server (`server/.env`)
| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `JWT_EXPIRES_IN` | No | Token expiry (default: `7d`) |
| `PORT` | No | Server port (default: `5000`) |
| `NODE_ENV` | No | `development` / `production` / `test` |
| `CLIENT_URL` | No | Frontend URL for CORS |
| `REDIS_URL` | No | Redis connection URL (default: `redis://localhost:6379`) |
| `BREVO_API_KEY` | No | Brevo email API key |
| `OPENAI_API_KEY` | No | OpenAI key for LLM question generation |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | No | Google OAuth callback URL |

### Client (`client/.env`)
| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No | Backend API URL (default: `http://localhost:5000/api`) |

## Development Commands

```bash
# Server
cd server && npm install && npm run dev     # Starts on :5000

# Client
cd client && npm install && npm run dev     # Starts on :8080

# Redis (required for battle system)
# Install and run Redis locally, or use Docker:
docker run -d -p 6379:6379 redis:alpine

# Seeding
cd server && npm run seed:all               # All seed data (legacy modules, lessons, quizzes, achievements, testimonials)
cd server && npm run seed                   # Learning content only (legacy)
cd server && npm run seed:v2                # Dynamic V2 lessons (step-based)
cd server && npm run seed:testimonials      # Testimonials only
cd server && npm run seed:questions         # Question bank for battle system

# Building
cd server && npm run build                  # → server/dist/
cd client && npm run build                  # → client/dist/
```

## Deployment

- **Client**: Vercel (auto-deploys from git). `vercel.json` rewrites all routes to `index.html`.
- **Server**: Render (Node.js service). Build: `npm run build`, Start: `npm run start`.
- **Database**: MongoDB Atlas.
- **Cache**: Redis — required for matchmaking and Socket.io adapter. Use Redis Cloud or Render Redis add-on.
- **Email**: Brevo HTTP API (not SMTP — Render blocks outbound SMTP ports).

## Key Design Decisions

1. **OTP-based auth** — both signup and login require email OTP verification
2. **In-memory signup OTP store** — lives in a `Map`, acceptable for single-instance deployment
3. **Brevo HTTP API over SMTP** — Render blocks SMTP ports
4. **shadcn/ui** — components are copied into repo (not a package dependency)
5. **Express 5** — native async error handling
6. **Zod on both sides** — Server uses v4, Client uses v3 (via react-hook-form resolvers)
7. **No test framework** — no unit/integration tests currently in place
8. **Gamification** — XP leveling, login streaks, achievements, virtual wallet, simulated stocks
9. **Adaptive lesson engine (V2)** — step-based lessons (info + MCQ), server-driven adaptive flow based on performance telemetry
10. **Dual lesson systems** — Legacy slide-based routes kept for backward compatibility alongside V2 engine
11. **Real-time Quiz Battle** — Socket.io + Redis adapter; matchmaking queue with ELO-based skill window; in-memory BattleEngine; anti-cheat via Redis SETNX
12. **ELO rating system** — Dynamic K-factor; mode-specific multipliers; RatingHistory log per battle
13. **Adaptive question selection** — questions chosen per-battle based on both players' weak topics and combined accuracy
14. **Redis required** — matchmaking queue, Socket.io pub-sub adapter, anti-cheat rate-limiting all depend on Redis

## Things to Avoid

- Do NOT use SMTP for email — always use Brevo HTTP API
- Do NOT store sensitive data in client-side code
- Do NOT skip Zod validation on new routes
- Do NOT use `console.log` — use the Pino `logger` from `utils/logger.ts`
- Do NOT add new shadcn components without running `npx shadcn-ui@latest add <component>`
- Do NOT hardcode API URLs — use `VITE_API_URL` env var on client, `env.ts` config on server
- Do NOT hardcode lesson content in the client — use the V2 dynamic engine and seed data on the server
- Do NOT send MCQ `correctAnswer` or `explanation` to the client before submission (server strips these)
- Do NOT start Socket.io without Redis in production — the Redis adapter is required for cross-instance message delivery
- Do NOT skip anti-cheat middleware on battle answer events
- Do NOT allow players to join the matchmaking queue if `activeBattleId` is set
