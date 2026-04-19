/** @format */

import api from "@/services/api";
import {
  BattleHistoryItem,
  BattleAnalytics,
  BattleLeaderboardEntry,
} from "@/features/battle/types/battle.types";

interface PaginatedResponse<T> {
  battles: T[];
  total: number;
  page: number;
  totalPages: number;
}

/* ── Battle History ── */

export async function fetchBattleHistory(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<BattleHistoryItem>> {
  return api.get(`/battle/history?page=${page}&limit=${limit}`);
}

/* ── Battle Detail ── */

export async function fetchBattleDetail(battleId: string): Promise<any> {
  return api.get(`/battle/${battleId}`);
}

/* ── Analytics ── */

export async function fetchBattleAnalytics(): Promise<BattleAnalytics> {
  return api.get("/battle/analytics/me");
}

/* ── Leaderboard ── */

export async function fetchBattleLeaderboard(
  limit: number = 20
): Promise<BattleLeaderboardEntry[]> {
  return api.get(`/battle/leaderboard?limit=${limit}`);
}

/* ── Rating History ── */

export async function fetchRatingHistory(limit: number = 30): Promise<
  {
    date: string;
    rating: number;
    change: number;
    result: string;
  }[]
> {
  return api.get(`/battle/rating/history?limit=${limit}`);
}

/* ── Room (REST fallback) ── */

export async function createRoomRest(config?: any): Promise<{
  code: string;
  roomId: string;
}> {
  return api.post("/battle/rooms", config);
}

export async function joinRoomRest(code: string): Promise<any> {
  return api.post("/battle/rooms/join", { code });
}
