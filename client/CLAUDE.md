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
│   ├── LearningPage.tsx
│   ├── LessonPage.tsx      # Dynamic V2 lesson engine (server-driven)
│   ├── QuizPage.tsx        # Redesigned quiz UI
│   ├── WalletPage.tsx / AchievementsPage.tsx
│   ├── LeaderboardPage.tsx / BattlesPage.tsx
│   ├── ToolsPage.tsx / SettingsPage.tsx
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

- **Global state**: React Context API — `AuthContext`, `WalletContext`, `ProgressContext`
- **Server state**: TanStack React Query v5 — handles caching, refetching, loading states
- Never mix concerns — contexts manage auth/user state, Query manages API data

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

### Routing

- React Router v6 in `App.tsx`
- Protected routes wrapped in `<ProtectedRoute>` — redirects to `/login` if unauthenticated
- Route constants defined in `constants/index.ts`

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
