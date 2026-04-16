# MoneyMaster — Project Guide

A gamified financial literacy learning platform for young learners (ages 5–25). Users progress through structured learning modules, earn XP, manage a virtual wallet, trade simulated stocks, unlock achievements, and compete on leaderboards.

---

## Architecture Overview

Monorepo with two independent apps:

```
Capstone/
├── client/          # React SPA (Vite + TypeScript)
├── server/          # Express REST API (TypeScript)
└── .gitignore
```

- **Client** → deployed on **Vercel** (SPA with catch-all rewrite)
- **Server** → deployed on **Render** (Node.js service)
- **Database** → **MongoDB Atlas** (Mongoose ODM)
- Communication: REST over HTTPS, JWT Bearer auth, JSON request/response

---

## Tech Stack

### Server (`server/`)
| Layer | Technology |
|---|---|
| Runtime | Node.js, TypeScript (ES2021, CommonJS) |
| Framework | Express 5 |
| Database | MongoDB via Mongoose 8 |
| Auth | JWT (`jsonwebtoken`), bcryptjs, Passport (Google OAuth 2.0) |
| Validation | Zod (v4) |
| Email | Brevo HTTP API (`email.service.ts`) |
| Logging | Pino + pino-pretty |
| Security | Helmet, CORS (origin allowlist), cookie-parser |
| Dev Tools | ts-node-dev (hot reload), rimraf (clean builds) |

### Client (`client/`)
| Layer | Technology |
|---|---|
| Framework | React 18, TypeScript |
| Build | Vite 5 (SWC plugin) |
| Styling | Tailwind CSS 3 + tailwindcss-animate, CSS variables (HSL design tokens) |
| UI Components | shadcn/ui (Radix UI primitives) |
| State | React Context API (AuthContext, WalletContext, ProgressContext) |
| Data Fetching | TanStack React Query v5 + custom `api.ts` fetch wrapper |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod resolvers |
| Charts | Recharts |
| Fonts | Nunito (primary), Inter (fallback) |
| Notifications | Sonner + shadcn Toaster |

---

## Project Structure

### Server
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
│   ├── Lesson.ts           # Lessons within modules
│   ├── Quiz.ts             # Quizzes per module
│   ├── Progress.ts         # User learning progress & achievements
│   ├── Wallet.ts           # Virtual currency wallet
│   ├── Stock.ts            # Simulated stock data
│   ├── Achievement.ts      # Achievement definitions
│   └── Testimonial.ts      # User testimonials
├── modules/                # Feature modules (controller/service/routes/schema pattern)
│   ├── auth/
│   ├── learning/
│   ├── wallet/
│   ├── stocks/
│   ├── achievements/
│   ├── leaderboard/
│   └── testimonials/
├── routes/
│   └── index.ts            # Central router (/api prefix)
├── data/                   # Seed data files
├── scripts/                # Database seeding scripts
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

### Client
```
client/src/
├── App.tsx                 # Root with providers & route definitions
├── main.tsx                # ReactDOM entry
├── index.css               # Global styles + Tailwind + CSS variables
├── components/
│   ├── ui/                 # shadcn/ui components (49 components)
│   ├── theme-provider.tsx  # Dark/light/system theme
│   └── theme-toggle.tsx    # Theme switcher
├── contexts/
│   ├── AuthContext.tsx      # Authentication state & actions
│   ├── WalletContext.tsx    # Virtual wallet state
│   └── ProgressContext.tsx  # Learning progress state
├── features/
│   ├── auth/               # Auth feature components
│   ├── learning/           # Learning feature components
│   └── wallet/             # Wallet feature components
├── hooks/
│   ├── use-mobile.tsx      # Responsive breakpoint hook
│   └── use-toast.ts        # Toast notification hook
├── layouts/
│   ├── DashboardLayout.tsx # Authenticated layout with sidebar
│   └── NavLink.tsx         # Navigation link component
├── pages/                  # Route-level page components
│   ├── Landing.tsx
│   ├── Login.tsx / Signup.tsx / VerifyOtp.tsx
│   ├── ForgotPassword.tsx / ResetPassword.tsx
│   ├── OAuthCallback.tsx
│   ├── DashboardPage.tsx
│   ├── LearningPage.tsx / LessonPage.tsx / QuizPage.tsx
│   ├── WalletPage.tsx
│   ├── AchievementsPage.tsx
│   ├── LeaderboardPage.tsx
│   ├── BattlesPage.tsx
│   ├── ToolsPage.tsx
│   ├── SettingsPage.tsx
│   └── NotFound.tsx
├── services/
│   └── api.ts              # Fetch wrapper with auth token injection
├── constants/
│   └── index.ts            # APP_NAME, API_BASE_URL, ROUTES
├── lib/
│   └── utils.ts            # cn() (clsx + tailwind-merge)
└── types/
    └── index.ts            # Shared TypeScript interfaces
```

---

## Coding Conventions & Patterns

### Server Conventions

1. **Module pattern**: Each feature lives in `server/src/modules/<feature>/` with:
   - `<feature>.controller.ts` — route handlers (use `asyncHandler` wrapper)
   - `<feature>.service.ts` — business logic
   - `<feature>.routes.ts` — Express Router with middleware
   - `<feature>.schema.ts` — Zod validation schemas

2. **Error handling**: Throw `ApiError(statusCode, message)` — the global `errorHandler` middleware catches everything.

3. **Validation**: Use the `validate(schema)` middleware in routes. It parses `req.body` (default), `req.query`, or `req.params`.

4. **Response format**: Always use `sendSuccess(res, data, message?, statusCode?)` which returns:
   ```json
   { "status": "success", "data": { ... }, "message": "..." }
   ```
   Errors return:
   ```json
   { "status": "error", "message": "..." }
   ```

5. **Authentication**: JWT Bearer token. Use `authenticate` middleware on protected routes. Access user via `req.user` (typed as `IUserDocument`).

6. **Model naming**: Mongoose models use PascalCase with `Model` suffix (e.g., `UserModel`, `WalletModel`). Interfaces use `I` prefix (e.g., `IUser`, `IUserDocument`).

7. **Environment variables**: All env vars validated at startup via Zod in `config/env.ts`. Access via `env.VAR_NAME`.

8. **Password security**: bcrypt (salt rounds: 10), SHA-256 for OTP/token hashing. Sensitive fields use `select: false` in schemas.

### Client Conventions

1. **Path aliases**: `@/` maps to `client/src/` (configured in `vite.config.ts` and `tsconfig`).

2. **UI components**: Use shadcn/ui from `@/components/ui/`. Style with Tailwind CSS + CSS variables (HSL color tokens defined in `index.css`).

3. **State management**: React Context for global state (Auth, Wallet, Progress). TanStack Query for server state.

4. **API calls**: Use the `api` object from `@/services/api.ts`:
   ```ts
   api.get<T>(endpoint)
   api.post<T>(endpoint, data?)
   api.patch<T>(endpoint, data?)
   api.put<T>(endpoint, data?)
   api.delete<T>(endpoint)
   ```
   Tokens are auto-injected. Errors throw with the server's error message.

5. **Protected routes**: Wrap in `<ProtectedRoute>` component — redirects to `/login` if unauthenticated.

6. **Page components**: Each page is a standalone component in `client/src/pages/`. Feature-specific sub-components go in `client/src/features/<feature>/`.

7. **Theme**: Dark/light/system via `next-themes`. Theme key: `moneymaster-theme`.

8. **Font stack**: Nunito → Inter → system-ui → sans-serif.

---

## API Routes

All routes prefixed with `/api`:

| Route | Auth | Description |
|---|---|---|
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
| `GET /api/learning/*` | Yes | Learning modules, lessons, quizzes |
| `* /api/wallet/*` | Yes | Virtual wallet operations |
| `* /api/stocks/*` | Yes | Stock market simulation |
| `* /api/achievements/*` | Yes | Achievement tracking |
| `GET /api/leaderboard/*` | Yes | Leaderboard data |
| `GET /api/testimonials/*` | Mixed | Testimonial data |
| `GET /health` | No | Health check endpoint |

---

## Auth Flow

1. **Signup/Login**: User submits credentials → server sends 7-digit OTP via email → user verifies OTP → receives JWT token
2. **Signup OTP**: Stored in-memory (`Map`) with 10-min TTL, cleaned every 5 minutes
3. **Login OTP**: Stored on the User document (`loginOtp`, `loginOtpExpires`) with 10-min TTL
4. **Google OAuth**: Passport strategy → creates/links user → redirects to client with JWT in URL query
5. **Token storage**: Client stores JWT in `localStorage` (key: `auth_token`)
6. **Session restore**: On mount, AuthContext checks for existing token and fetches `/api/auth/me`

---

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

---

## Development

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm

### Quick Start
```bash
# Server
cd server
cp .env.example .env    # Fill in MONGODB_URI and JWT_SECRET
npm install
npm run dev             # Starts on :5000

# Client (separate terminal)
cd client
cp .env.example .env
npm install
npm run dev             # Starts on :8080
```

### Seeding
```bash
cd server
npm run seed:all        # Seeds modules, lessons, quizzes, achievements, testimonials
npm run seed            # Seeds learning content only
npm run seed:testimonials
```

### Building
```bash
# Server
cd server
npm run build           # Outputs to server/dist/

# Client
cd client
npm run build           # Outputs to client/dist/
```

---

## Deployment

- **Client**: Vercel (auto-deploys from git). `vercel.json` rewrites all routes to `index.html` for SPA.
- **Server**: Render (Node.js service). Build command: `npm run build`, Start: `npm run start`.
- **Database**: MongoDB Atlas.
- **Email**: Brevo HTTP API (not SMTP — Render blocks outbound SMTP ports).

---

## Key Design Decisions

1. **OTP-based auth** (not session cookies): Both signup and login require email OTP verification.
2. **In-memory signup OTP store**: Signup OTPs live in a `Map` (not DB) — acceptable for single-instance deployment.
3. **Brevo HTTP API over SMTP**: Render blocks SMTP ports, so email uses Brevo's REST API directly.
4. **shadcn/ui**: Components are copied into the repo (not a package dependency) — customizable.
5. **Express 5**: Using the latest Express version with native async error handling.
6. **Zod on both sides**: Server uses Zod v4, client uses Zod v3 (via react-hook-form resolvers).
7. **No test framework configured**: No unit/integration tests currently in place.
8. **Gamification**: XP-based leveling, login streaks, achievement badges, virtual wallet with simulated stock trading.
