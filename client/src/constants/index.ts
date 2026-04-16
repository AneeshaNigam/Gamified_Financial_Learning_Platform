/** @format */

/**
 * App-wide constants.
 */

export const APP_NAME = "MoneyMaster";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  DASHBOARD: "/dashboard",
  WALLET: "/wallet",
  STOCKS: "/stocks",
  LEARNING: "/learning",
  ACHIEVEMENTS: "/achievements",
  LEADERBOARD: "/leaderboard",
  BATTLES: "/battles",
  TOOLS: "/tools",
  PORTFOLIO: "/portfolio",
  SETTINGS: "/settings",
} as const;
