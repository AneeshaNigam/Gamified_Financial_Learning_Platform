<div align="center">

# MoneyMaster — API Documentation

**Complete REST API & WebSocket reference for the MoneyMaster platform.**

[![API Version](https://img.shields.io/badge/API-v1.0-2563eb?style=for-the-badge)](https://finlearnplat.vercel.app)
[![Express](https://img.shields.io/badge/Express-5-339933?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)

</div>

---

## Table of Contents

- [API Overview](#api-overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Request / Response Format](#request--response-format)
- [HTTP Status Codes](#http-status-codes)
- [Error Handling](#error-handling)
- [Authentication APIs](#1-authentication-apis)
- [Learning Engine APIs](#2-learning-engine-apis)
- [Battle System APIs](#3-battle-system-apis)
- [Wallet APIs](#4-wallet-apis)
- [Stock Market APIs](#5-stock-market-apis)
- [Achievement APIs](#6-achievement-apis)
- [Leaderboard APIs](#7-leaderboard-apis)
- [Testimonial APIs](#8-testimonial-apis)
- [WebSocket Events](#websocket-events)
- [Pagination](#pagination)
- [Health Check](#health-check)

---

## API Overview

MoneyMaster exposes a RESTful API over HTTPS alongside a persistent WebSocket layer (Socket.io) for real-time features. All REST endpoints are served under the `/api` prefix. Real-time quiz battles, matchmaking, and presence tracking operate exclusively over WebSocket.

| Protocol | Purpose |
|---|---|
| **REST (HTTPS)** | CRUD operations, authentication, learning, wallet, stocks, leaderboards |
| **WebSocket (Socket.io)** | Real-time battle system, matchmaking queue, presence, anti-cheat |

---

## Base URL

| Environment | URL |
|---|---|
| **Production** | `https://your-backend.onrender.com/api` |
| **Development** | `http://localhost:5000/api` |
| **Health Check** | `GET /health` (no `/api` prefix) |

---

## Authentication

MoneyMaster uses **JWT Bearer Token** authentication. Tokens are issued after successful OTP verification or Google OAuth sign-in.

### Obtaining a Token

1. Call `POST /api/auth/signup` or `POST /api/auth/login` — server sends OTP to email.
2. Call `POST /api/auth/verify-otp` with the OTP — server returns JWT.
3. Include the token in all subsequent requests.

### Attaching the Token

```
Authorization: Bearer <your-jwt-token>
```

### Token Lifecycle

| Property | Value |
|---|---|
| Algorithm | HS256 |
| Expiration | 7 days (configurable via `JWT_EXPIRES_IN`) |
| Storage | Client-side `localStorage` (key: `auth_token`) |
| Refresh | Re-authenticate via OTP or OAuth |

---

## Request / Response Format

### Success Response

```json
{
  "status": "success",
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Descriptive error message",
  "details": { ... }
}
```

All request bodies must be sent as `application/json`. Maximum payload size: **1 MB**.

---

## HTTP Status Codes

| Code | Meaning | Usage |
|---|---|---|
| `200` | OK | Successful GET, PATCH, PUT |
| `201` | Created | Successful POST (resource created) |
| `400` | Bad Request | Validation error, malformed input |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | Authenticated but insufficient permissions |
| `404` | Not Found | Resource or route does not exist |
| `409` | Conflict | Duplicate resource (e.g., email already registered) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unhandled server exception |

---

## Error Handling

All errors follow a consistent envelope format. Validation errors from Zod include field-level details:

```json
{
  "status": "error",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

Route-not-found errors return:

```json
{
  "status": "error",
  "message": "Route /api/unknown not found"
}
```

---

## 1. Authentication APIs

All auth routes are prefixed with `/api/auth`.

---

### `POST /api/auth/signup`

Initiate user registration. Sends a 7-digit OTP to the provided email.

**Auth Required:** No

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecureP@ss1",
  "age": 18,
  "grade": "12th",
  "school": "MIT Academy"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | Yes | 1–50 characters |
| `email` | string | Yes | Valid email, max 100 characters |
| `password` | string | Yes | 8–128 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character |
| `age` | number | No | 5–25 |
| `grade` | string | No | Max 20 characters |
| `school` | string | No | Max 100 characters |

**Success Response (200):**

```json
{
  "status": "success",
  "message": "OTP sent to john@example.com"
}
```

---

### `POST /api/auth/login`

Initiate login. Sends a 7-digit OTP to the registered email.

**Auth Required:** No

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "SecureP@ss1"
}
```

**Success Response (200):**

```json
{
  "status": "success",
  "message": "OTP sent to john@example.com"
}
```

---

### `POST /api/auth/verify-otp`

Verify the OTP and complete authentication. Returns a JWT token on success.

**Auth Required:** No

**Request Body:**

```json
{
  "email": "john@example.com",
  "otp": "4829173",
  "flow": "signup"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | Yes | Valid email |
| `otp` | string | Yes | Exactly 7 digits |
| `flow` | string | Yes | `"login"` or `"signup"` |

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "name": "John Doe",
      "email": "john@example.com",
      "level": 1,
      "xp": 0,
      "eloRating": 1200
    }
  }
}
```

---

### `POST /api/auth/resend-otp`

Resend the OTP to the specified email.

**Auth Required:** No

**Request Body:**

```json
{
  "email": "john@example.com",
  "flow": "signup",
  "password": "SecureP@ss1"
}
```

---

### `GET /api/auth/me`

Get the authenticated user's profile.

**Auth Required:** Yes

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "name": "John Doe",
    "email": "john@example.com",
    "level": 5,
    "xp": 2450,
    "eloRating": 1340,
    "battleStats": {
      "totalBattles": 12,
      "wins": 8,
      "losses": 3,
      "draws": 1,
      "winStreak": 3,
      "bestWinStreak": 5
    },
    "presenceStatus": "online"
  }
}
```

---

### `PATCH /api/auth/me`

Update the authenticated user's profile.

**Auth Required:** Yes

**Request Body:**

```json
{
  "name": "John Updated",
  "age": 19,
  "grade": "College",
  "school": "Stanford University",
  "knowledgeLevel": "intermediate"
}
```

All fields are optional.

---

### `POST /api/auth/xp`

Add XP to the authenticated user.

**Auth Required:** Yes

**Request Body:**

```json
{
  "amount": 50
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `amount` | number | Yes | 1–1000 |

---

### `POST /api/auth/forgot-password`

Send a password reset email with a reset token.

**Auth Required:** No

**Request Body:**

```json
{
  "email": "john@example.com"
}
```

---

### `POST /api/auth/reset-password/:token`

Reset the password using a valid reset token.

**Auth Required:** No

**Request Body:**

```json
{
  "password": "NewSecureP@ss2"
}
```

---

### `POST /api/auth/change-password`

Change the password for the authenticated user.

**Auth Required:** Yes

**Request Body:**

```json
{
  "currentPassword": "SecureP@ss1",
  "newPassword": "NewSecureP@ss2"
}
```

---

### `GET /api/auth/google`

Initiate Google OAuth 2.0 sign-in flow. Redirects to Google consent screen.

**Auth Required:** No

---

### `GET /api/auth/google/callback`

Google OAuth callback. On success, redirects to `CLIENT_URL/oauth/callback?token=<jwt>`.

**Auth Required:** No

---

## 2. Learning Engine APIs

All learning routes are prefixed with `/api/learning`.

---

### Adaptive Engine (V2)

#### `GET /api/learning/current`

Get the next uncompleted adaptive lesson for the authenticated user. The server selects the optimal lesson based on the user's performance profile.

**Auth Required:** Yes

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "_id": "664b2c3d4e5f6a7b8c9d0e1f",
    "title": "Understanding Compound Interest",
    "topic": "investing",
    "difficulty": "intermediate",
    "steps": [
      {
        "type": "info",
        "title": "What is Compound Interest?",
        "content": "Compound interest is interest on interest..."
      },
      {
        "type": "mcq",
        "question": "Which scenario yields more interest?",
        "options": ["Simple interest at 10%", "Compound interest at 9%"],
        "xpReward": 20
      }
    ]
  }
}
```

---

#### `POST /api/learning/submit`

Submit an answer for an MCQ step in the current lesson. Records telemetry data (accuracy, response time, topic performance).

**Auth Required:** Yes

**Request Body:**

```json
{
  "lessonId": "664b2c3d4e5f6a7b8c9d0e1f",
  "stepIndex": 3,
  "selectedOption": 1,
  "timeTaken": 8500
}
```

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "correct": true,
    "correctAnswer": 1,
    "explanation": "Compound interest yields more over time because...",
    "xpEarned": 20
  }
}
```

---

#### `POST /api/learning/complete`

Mark the current V2 lesson as complete and receive the next recommended lesson.

**Auth Required:** Yes

---

### Legacy Routes (Backward Compatibility)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/learning/modules` | Yes | List all modules with user progress |
| `GET` | `/api/learning/progress` | Yes | Get user's overall learning progress |
| `GET` | `/api/learning/lessons/:moduleId/:lessonId` | Yes | Get specific lesson content |
| `POST` | `/api/learning/lessons/:moduleId/:lessonId/complete` | Yes | Mark a legacy lesson as complete |
| `GET` | `/api/learning/quizzes/:moduleId` | Yes | Get quiz for a module |
| `POST` | `/api/learning/quizzes/:moduleId/submit` | Yes | Submit quiz answers |

---

## 3. Battle System APIs

All battle routes are prefixed with `/api/battle`.

> Real-time battle interactions (matchmaking, answer submission, forfeiting) operate over WebSocket. See the [WebSocket Events](#websocket-events) section.

---

### `GET /api/battle/history`

Get the authenticated user's battle history.

**Auth Required:** Yes

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | string | `"1"` | Page number |
| `limit` | string | `"10"` | Results per page |

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "battles": [
      {
        "_id": "664c3d4e5f6a7b8c9d0e1f2a",
        "mode": "ranked",
        "players": ["664a...", "664b..."],
        "winner": "664a...",
        "scores": { "664a...": 7, "664b...": 4 },
        "eloChanges": { "664a...": 24, "664b...": -24 },
        "duration": 145,
        "createdAt": "2025-06-01T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 42
    }
  }
}
```

---

### `GET /api/battle/analytics/me`

Get personal battle analytics for the authenticated user.

**Auth Required:** Yes

---

### `GET /api/battle/leaderboard`

Get the global battle ELO leaderboard.

**Auth Required:** No

---

### `GET /api/battle/:battleId`

Get detailed information about a specific battle.

**Auth Required:** Yes

---

### `POST /api/battle/rooms`

Create a private battle room. Returns a 6-character room code.

**Auth Required:** Yes

**Request Body:**

```json
{
  "config": {
    "totalQuestions": 10,
    "timePerQuestion": 15
  },
  "topics": ["budgeting", "investing"]
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `config.totalQuestions` | number | No | 5–20 (default: 10) |
| `config.timePerQuestion` | number | No | 10–30 seconds (default: 15) |
| `topics` | string[] | No | Filter questions by topic |

**Success Response (201):**

```json
{
  "status": "success",
  "data": {
    "roomId": "664d4e5f6a7b8c9d0e1f2a3b",
    "code": "A7K3M2",
    "expiresAt": "2025-06-01T10:35:00Z"
  }
}
```

---

### `POST /api/battle/rooms/join`

Join a private room using the 6-character room code.

**Auth Required:** Yes

**Request Body:**

```json
{
  "code": "A7K3M2"
}
```

---

### `GET /api/battle/rating/history`

Get the authenticated user's ELO rating change history.

**Auth Required:** Yes

---

## 4. Wallet APIs

All wallet routes are prefixed with `/api/wallet`.

---

### `GET /api/wallet`

Get the authenticated user's wallet summary.

**Auth Required:** Yes

---

### `POST /api/wallet/earn`

Add earned coins (Lucre) to the wallet.

**Auth Required:** Yes

**Request Body:**

```json
{
  "amount": 100,
  "description": "Completed budgeting lesson"
}
```

---

### `POST /api/wallet/discretionary/add`

Add funds to the discretionary spending category.

**Auth Required:** Yes

**Request Body:**

```json
{
  "amount": 50,
  "description": "Savings transfer"
}
```

---

### `POST /api/wallet/discretionary/deduct`

Deduct funds from discretionary spending.

**Auth Required:** Yes

**Request Body:**

```json
{
  "amount": 25,
  "description": "Stock purchase"
}
```

---

### `POST /api/wallet/payout`

Trigger a wallet payout event.

**Auth Required:** Yes

---

### `PUT /api/wallet/expenses`

Set monthly expense allocations.

**Auth Required:** Yes

**Request Body:**

```json
{
  "tax": 500,
  "rent": 2000,
  "food": 800,
  "utilities": 300,
  "other": 150
}
```

---

## 5. Stock Market APIs

All stock routes are prefixed with `/api/stocks`.

---

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/stocks` | No | List all available stocks with current prices |
| `GET` | `/api/stocks/portfolio` | Yes | Get user's stock portfolio |
| `POST` | `/api/stocks/refresh` | Yes | Refresh stock prices (simulated market movement) |
| `POST` | `/api/stocks/:symbol/buy` | Yes | Buy shares of a stock |
| `POST` | `/api/stocks/:symbol/sell` | Yes | Sell shares of a stock |

### Buy / Sell Request Body

```json
{
  "quantity": 5
}
```

---

## 6. Achievement APIs

All achievement routes are prefixed with `/api/achievements`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/achievements` | Yes | List all achievements with unlock status |
| `POST` | `/api/achievements/check` | Yes | Recalculate and award pending achievements |

---

## 7. Leaderboard APIs

All leaderboard routes are prefixed with `/api/leaderboard`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/leaderboard` | No | Get the global XP leaderboard |
| `GET` | `/api/leaderboard/me` | Yes | Get the authenticated user's standing |

---

## 8. Testimonial APIs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/testimonials` | No | Get all student testimonials |

---

## WebSocket Events

MoneyMaster uses **Socket.io 4** with a **Redis adapter** for real-time communication. Connections are authenticated via JWT in the handshake.

### Connection

```javascript
import { io } from "socket.io-client";

const socket = io("https://your-backend.onrender.com", {
  auth: {
    token: "eyJhbGciOiJIUzI1NiIs..."
  }
});
```

---

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `queue_join` | `{ mode: "quick" \| "ranked" }` | Join the matchmaking queue |
| `queue_leave` | — | Leave the matchmaking queue |
| `battle_ready` | `{ roomId: string }` | Signal ready after match found |
| `answer_submit` | `{ roomId, questionIndex, selectedOption, responseTimeMs }` | Submit an answer during battle |
| `battle_forfeit` | `{ roomId: string }` | Forfeit the current battle |
| `visibility_change` | `{ battleId, hidden: boolean }` | Tab-switch event (anti-cheat) |
| `heartbeat` | — | Presence heartbeat ping |
| `room_join` | `{ code: string }` | Join a private room via code |

---

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `queue_status` | `{ position, estimatedWaitSeconds, inQueue }` | Queue position update |
| `queue_error` | `{ message: string }` | Queue error (already in battle, etc.) |
| `queue_timeout` | `{ reason: string }` | No match found within time limit |
| `match_found` | `{ roomId, battleId, opponent }` | Match successfully created |
| `battle_start` | `{ roomId, question, questionIndex, totalQuestions }` | Battle begins, first question served |
| `question_start` | `{ question, questionIndex, timeLimit }` | Next question delivered |
| `answer_ack` | `{ accepted, questionIndex, reason? }` | Server acknowledged answer |
| `score_update` | `{ scores, lastAnswer }` | Score update after each answer |
| `battle_end` | `{ winner, scores, xpGained, eloChanges }` | Battle complete with results |
| `opponent_disconnected` | — | Opponent left mid-battle |

---

## Pagination

Paginated endpoints accept `page` and `limit` query parameters:

```
GET /api/battle/history?page=2&limit=20
```

**Paginated Response Format:**

```json
{
  "status": "success",
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 2,
      "limit": 20,
      "total": 85,
      "totalPages": 5
    }
  }
}
```

---

## Health Check

```
GET /health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-06-01T10:30:00.000Z"
}
```

No authentication required. Use this endpoint for uptime monitoring and load balancer health checks.

---

<div align="center">

**MoneyMaster API v1.0** · [Live Platform](https://finlearnplat.vercel.app) · [GitHub](https://github.com/AneeshaNigam/Gamified_Financial_Learning_Platform)

</div>
