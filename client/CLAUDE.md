# MoneyMaster — Client Conventions

This file contains client-specific instructions. See the root `CLAUDE.md` for project-wide context.

## Folder Structure

```
client/src/
├── App.tsx                 # Root with providers & route definitions
├── main.tsx                # ReactDOM entry
├── index.css               # Global styles + Tailwind + CSS variables
├── components/
│   ├── ui/                 # shadcn/ui components (49+ components)
│   ├── theme-provider.tsx  # Dark/light/system theme
│   └── theme-toggle.tsx    # Theme switcher
├── contexts/
│   ├── AuthContext.tsx      # Authentication state & actions
│   ├── WalletContext.tsx    # Virtual wallet state
│   ├── ProgressContext.tsx  # Learning progress state
│   ├── SocketContext.tsx    # Socket.io client connection management
│   └── BattleContext.tsx    # Battle state machine (queue, arena, results)
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
│   ├── LearningPage.tsx
│   ├── LessonPage.tsx          # Dynamic V2 lesson engine (server-driven)
│   ├── QuizPage.tsx            # Redesigned quiz UI
│   ├── WalletPage.tsx / AchievementsPage.tsx
│   ├── LeaderboardPage.tsx
│   ├── BattlesPage.tsx         # Battle lobby: Quick Match, Ranked, Private Room
│   ├── BattleArenaPage.tsx     # Live battle UI (question, timer, opponent score)
│   ├── BattleResultsPage.tsx   # Post-battle results: ELO change, XP, replay
│   ├── ToolsPage.tsx / SettingsPage.tsx
│   └── NotFound.tsx
├── services/
│   ├── api.ts              # Fetch wrapper with auth token injection
│   └── socket.ts           # Socket.io client instance (singleton)
├── constants/
│   └── index.ts            # APP_NAME, API_BASE_URL, ROUTES
├── lib/
│   └── utils.ts            # cn() (clsx + tailwind-merge)
└── types/
    └── index.ts            # Shared TypeScript interfaces
```

## Coding Conventions

### Imports & Path Aliases

- Use `@/` to import from `client/src/` — configured in `vite.config.ts` and `tsconfig`
- Example: `import { Button } from "@/components/ui/button"`

### UI Components

- Use shadcn/ui components from `@/components/ui/`
- Style with Tailwind CSS + CSS variables (HSL tokens in `index.css`)
- To add a new shadcn component: `npx shadcn-ui@latest add <component>`
- Use `cn()` from `@/lib/utils` for conditional class merging

### State Management

- **Global state**: React Context API — `AuthContext`, `WalletContext`, `ProgressContext`, `SocketContext`, `BattleContext`
- **Server state**: TanStack React Query v5 — handles caching, refetching, loading states
- Never mix concerns — contexts manage auth/user/battle state, Query manages API data

### API Calls

Use the `api` object from `@/services/api.ts`:
```ts
api.get<T>(endpoint)
api.post<T>(endpoint, data?)
api.patch<T>(endpoint, data?)
api.put<T>(endpoint, data?)
api.delete<T>(endpoint)
```
- Tokens are auto-injected from `localStorage`
- Errors throw with the server's error message
- Base URL comes from `VITE_API_URL` env var

### Socket.io

- Import the singleton socket from `@/services/socket.ts` — do **not** create multiple `io()` instances
- Use `SocketContext` to access the connected socket and connection state in components
- Use `BattleContext` for all battle-related socket events — it wraps all battle socket listeners and provides typed state
- Socket connects automatically when the user is authenticated; disconnects on logout
- JWT token is passed in `socket.auth.token` on handshake

### Routing

- React Router v6 in `App.tsx`
- Protected routes wrapped in `<ProtectedRoute>` — redirects to `/login` if unauthenticated
- Route constants defined in `constants/index.ts`
- Battle routes:
  - `/battles` — lobby page (matchmaking, private rooms, history)
  - `/battle/arena` — live battle arena (state passed via `BattleContext`)
  - `/battle/results` — post-battle results page

### Page Components

- Each page is a standalone component in `pages/`
- Feature-specific sub-components go in `features/<feature>/`
- Pages should be lazy-loaded where appropriate

### Theme

- Dark/light/system via `next-themes`
- Theme storage key: `moneymaster-theme`
- All colors use HSL CSS variables — defined in `index.css`

### Typography

- Primary font: **Nunito** (Google Fonts)
- Fallback: Inter → system-ui → sans-serif

### Forms

- React Hook Form + Zod v3 resolvers
- Form schemas in component files or co-located
- Use shadcn/ui form components (`Form`, `FormField`, `FormItem`, etc.)

### Notifications

- Use Sonner + shadcn Toaster for toast notifications
- Import `toast` from `sonner` for programmatic toasts

## Learner Analytics & Adaptive Lesson Engine (V2 — Client Side)

The `LessonPage.tsx` is now a **backend-driven**, adaptive lesson engine. No hardcoded lesson data exists on the client.

### Flow

1. **Fetch**: `GET /api/learning/current` → receives dynamically recommended lesson with steps (MCQ answers stripped, step telemetry initialized)
2. **Step-by-step rendering**:
   - `info` steps → user reads content, presses Continue (earns XP)
   - `mcq` steps → user selects answer → precise `timeTaken` tracking → `POST /api/learning/submit` → shows feedback (correct/wrong + explanation)
3. **Completion**: After last step → `POST /api/learning/complete` → next adaptive lesson auto-loads

### Key Rules

- **Never hardcode lesson content** — all content comes from the server's adaptive engine
- MCQ `correctAnswer` and `explanation` are NOT present in the initial fetch — only returned after submission
- The client renders steps sequentially with gamification animations (XP popups, confetti) and dynamic **topic/difficulty badges**
- Precise telemetry (e.g., `timeTaken` for MCQ) must be captured and sent to the server for learner analytics tracking

## Battle System (Client Side)

### BattleContext (`contexts/BattleContext.tsx`)

Central state machine for the entire battle flow. Manages:
- Current battle state: `idle | queuing | matched | in_progress | completed`
- Queue position and estimated wait time
- Active battle data: roomId, battleId, opponent info, current question, timer, scores
- Battle results for the results page

Subscribe to all server events here — do **not** listen to socket events directly in page components.

### Battle Pages

**`BattlesPage.tsx`** — Battle Lobby
- Quick Match: sends `queue_join` with `{mode: 'quick_match'}`, shows live queue position
- Ranked: sends `queue_join` with `{mode: 'ranked'}`, shows ELO and estimated wait
- Private Room: create (REST `POST /api/battle/rooms`) or join by code (REST `POST /api/battle/rooms/join`)
- Shows recent battle history and current ELO rating

**`BattleArenaPage.tsx`** — Live Battle
- Reads battle state from `BattleContext` — do NOT re-fetch from server during battle
- Renders current question from `question_start` event
- Countdown timer per question (15s default)
- Live opponent score display from `score_update` events
- Sends `answer_submit` on selection; shows `answer_ack` response
- Shows opponent disconnection overlay on `opponent_disconnected`
- Sends `visibility_change` on `document.visibilityState` change (anti-cheat)

**`BattleResultsPage.tsx`** — Post-Battle
- Renders data from `battle_end` event payload (winner, scores, ELO changes, XP gained)
- Shows per-question accuracy breakdown
- ELO rating change visualization (+/- with color)
- "Play Again" button: re-joins queue for the same mode

### Socket Event Lifecycle

```
User clicks "Find Match"
  → queue_join → queue_status (position updates)
  → match_found → navigate to /battle/arena
  → battle_start → question_start (q1)
  → answer_submit → answer_ack → score_update
  → question_start (q2) ... (repeat)
  → battle_end → navigate to /battle/results
```

### Key Rules

- Never navigate away from `/battle/arena` without calling `battle_forfeit` first
- Always clean up socket listeners in `useEffect` return / context unmount
- Battle state lives in `BattleContext` — do not duplicate it in local component state
- Show `answer_ack.reason` to the user when answer is rejected (rate-limited or already answered)
- The arena page must handle the case where the socket reconnects mid-battle (re-request battle state)
