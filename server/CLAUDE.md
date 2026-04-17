# MoneyMaster — Server Conventions

This file contains server-specific instructions. See the root `CLAUDE.md` for project-wide context.

## Folder Structure

```
server/src/
├── app.ts                  # Express app setup (middleware, routes)
├── server.ts               # HTTP server bootstrap
├── index.ts                # Entry point (connects DB, starts server)
├── config/
│   ├── env.ts              # Zod-validated environment variables
│   ├── database.ts         # MongoDB connection
│   └── passport.ts         # Google OAuth strategy
├── middleware/
│   ├── auth.ts             # JWT authenticate middleware
│   ├── validate.ts         # Zod validation middleware
│   └── errorHandler.ts     # Global error handler + 404
├── models/                 # Mongoose schemas & models
│   ├── User.ts             # User with auth, XP, streaks
│   ├── Module.ts           # Learning modules
│   ├── Lesson.ts           # Lessons within modules (legacy slide-based)
│   ├── LessonV2.ts         # Dynamic step-based lessons (info + MCQ)
│   ├── Quiz.ts             # Quizzes per module
│   ├── Progress.ts         # User learning progress & achievements
│   ├── Wallet.ts           # Virtual currency wallet
│   ├── Stock.ts            # Simulated stock data
│   ├── Achievement.ts      # Achievement definitions
│   └── Testimonial.ts      # User testimonials
├── modules/                # Feature modules
│   ├── auth/
│   ├── learning/           # Contains both legacy and V2 lesson engine
│   ├── wallet/
│   ├── stocks/
│   ├── achievements/
│   ├── leaderboard/
│   └── testimonials/
├── routes/
│   └── index.ts            # Central router (/api prefix)
├── data/                   # Seed data files
├── scripts/                # Database seeding scripts
│   ├── seed.ts             # Legacy learning content
│   ├── seedAll.ts          # All seed data (legacy)
│   ├── seedLessonsV2.ts    # V2 dynamic step-based lessons
│   ├── seedAchievements.ts
│   ├── seedLessons.ts
│   ├── seedModules.ts
│   ├── seedQuizzes.ts
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

- Mongoose models: PascalCase with `Model` suffix — `UserModel`, `WalletModel`, `LessonV2Model`
- Interfaces: `I` prefix — `IUser`, `IUserDocument`, `ILessonV2`
- Schema fields with sensitive data use `select: false`

### Authentication

- Use `authenticate` middleware on protected routes
- Access user via `req.user` (typed as `IUserDocument` in `types/express.d.ts`)
- JWT signed with `env.JWT_SECRET`, default expiry `7d`

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

## Dynamic Lesson Engine (V2)

The V2 lesson system replaces hardcoded client-side slides with a server-driven step engine.

### Model: `LessonV2` (`models/LessonV2.ts`)

- `order` (number) — global lesson sequence for auto-advancement
- `moduleId` (number) — which module this lesson belongs to
- `lessonId` (string) — unique within a module
- `steps[]` — array of `IInfoStep` or `IMcqStep` (discriminated union on `type`)
- `xpReward` / `lucreReward` — bonus awarded on lesson completion
- `source` — `'seed' | 'ai' | 'manual'` (for future AI-generated lessons)

### Step Types

- **info**: Read-only content card with `content` (markdown-friendly) and optional `emoji`. Awards `xp` on view.
- **mcq**: Multiple-choice question with `question`, `options[]`, `correctAnswer`, `explanation`. Awards full `xp` if correct, partial (25%) if wrong.

### API Flow

1. `GET /api/learning/current` — returns next uncompleted lesson (strips `correctAnswer` and `explanation` from MCQ steps)
2. `POST /api/learning/submit` — evaluates MCQ answer, awards XP, returns feedback with correct answer
3. `POST /api/learning/complete` — marks lesson done, awards bonus XP/lucre, returns next lesson

### Seeding

```bash
npm run seed:v2   # Runs scripts/seedLessonsV2.ts — clears and re-seeds all V2 lessons
```

### Important Rules

- Never send `correctAnswer` or `explanation` to the client before the user submits an answer
- Legacy routes (`/lessons/:moduleId/:lessonId`) are preserved for backward compatibility
- New lessons should use the V2 model, not the legacy `Lesson` model
