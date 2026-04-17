# MoneyMaster — Project Guide

A gamified financial literacy learning platform for young learners (ages 5–25). Users progress through structured learning modules, earn XP, manage a virtual wallet, trade simulated stocks, unlock achievements, and compete on leaderboards.

## Architecture

Monorepo with two independent apps:

```
Capstone/
├── client/          # React SPA (Vite + TypeScript) → deployed on Vercel
├── server/          # Express REST API (TypeScript) → deployed on Render
├── CLAUDE.md        # This file — project-wide instructions
├── client/CLAUDE.md # Client-specific conventions
└── server/CLAUDE.md # Server-specific conventions
```

- **Database**: MongoDB Atlas (Mongoose ODM)
- **Communication**: REST over HTTPS, JWT Bearer auth, JSON request/response

## Tech Stack (Summary)

- **Server**: Node.js, TypeScript, Express 5, Mongoose 8, Zod v4, JWT + Passport (Google OAuth), Brevo HTTP API, Pino logger
- **Client**: React 18, TypeScript, Vite 5, Tailwind CSS 3 + shadcn/ui, TanStack React Query v5, React Router v6, React Hook Form + Zod v3, Recharts

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

### Client Patterns

- Path alias: `@/` → `client/src/`
- UI: shadcn/ui components from `@/components/ui/`
- State: React Context (Auth, Wallet, Progress) + TanStack Query for server state
- API calls: Use `api` object from `@/services/api.ts` (tokens auto-injected)
- Theme: Dark/light/system via `next-themes` (key: `moneymaster-theme`)
- Font: Nunito → Inter → system-ui → sans-serif

## Lesson Engine (V2)

The platform uses a **dynamic step-based lesson engine**:
- Lessons are stored in the `LessonV2` model with ordered `steps` (info cards + MCQ questions)
- The server drives all lesson flow — no hardcoded lesson data on the client
- Steps award XP incrementally; MCQ answers give partial XP even if wrong
- Legacy slide-based lesson routes are kept for backward compatibility

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
| **Other** | | |
| `* /api/wallet/*` | Yes | Virtual wallet operations |
| `* /api/stocks/*` | Yes | Stock market simulation |
| `* /api/achievements/*` | Yes | Achievement tracking |
| `GET /api/leaderboard/*` | Yes | Leaderboard data |
| `GET /api/testimonials/*` | Mixed | Testimonial data |
| `GET /health` | No | Health check endpoint |

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
| `BREVO_API_KEY` | No | Brevo email API key |
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

# Seeding
cd server && npm run seed:all               # All seed data (legacy modules, lessons, quizzes, achievements, testimonials)
cd server && npm run seed                   # Learning content only (legacy)
cd server && npm run seed:v2                # Dynamic V2 lessons (step-based)
cd server && npm run seed:testimonials      # Testimonials only

# Building
cd server && npm run build                  # → server/dist/
cd client && npm run build                  # → client/dist/
```

## Deployment

- **Client**: Vercel (auto-deploys from git). `vercel.json` rewrites all routes to `index.html`.
- **Server**: Render (Node.js service). Build: `npm run build`, Start: `npm run start`.
- **Database**: MongoDB Atlas.
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
9. **Dynamic lesson engine (V2)** — step-based lessons (info + MCQ), server-driven flow, replaces hardcoded client slides
10. **Dual lesson systems** — Legacy slide-based routes kept for backward compatibility alongside V2 engine

## Things to Avoid

- Do NOT use SMTP for email — always use Brevo HTTP API
- Do NOT store sensitive data in client-side code
- Do NOT skip Zod validation on new routes
- Do NOT use `console.log` — use the Pino `logger` from `utils/logger.ts`
- Do NOT add new shadcn components without running `npx shadcn-ui@latest add <component>`
- Do NOT hardcode API URLs — use `VITE_API_URL` env var on client, `env.ts` config on server
- Do NOT hardcode lesson content in the client — use the V2 dynamic engine and seed data on the server
- Do NOT send MCQ `correctAnswer` or `explanation` to the client before submission (server strips these)
