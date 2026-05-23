import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SafeUserInfo } from "@gamenite/shared";
import { getUsers } from "../services/userService.ts";

export interface LeaderboardFilters {
  limit: number;
  gameType: string | null;
  dateRange: "all" | "week" | "month" | "year";
}

export interface LeaderboardEntry {
  user: SafeUserInfo;
  points: number;
  rank: number;
}

export interface LeaderboardData {
  rankings: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
}

interface UseLeaderboardResult extends LeaderboardData {
  isLoading: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
}

/**
 * Recomputes points earned within a selected date range from tournament history.
 */
function getPointsInRange(user: SafeUserInfo, dateRange: LeaderboardFilters["dateRange"]): number {
  if (dateRange === "all" || !user.tournaments) return user.points;
  const cutoff = new Date();
  if (dateRange === "week") cutoff.setDate(cutoff.getDate() - 7);
  if (dateRange === "month") cutoff.setMonth(cutoff.getMonth() - 1);
  if (dateRange === "year") cutoff.setFullYear(cutoff.getFullYear() - 1);
  return user.tournaments
    .filter((t) => new Date(t.createdAt) >= cutoff && t.placement > 0)
    .reduce((sum, t) => sum + Math.round((t.participantCount / Math.max(t.placement, 1)) * 100), 0);
}

/**
 * Loads leaderboard data and derives filtered rankings for the current view.
 */
export default function useLeaderboard(
  currentUsername: string,
  filters: LeaderboardFilters,
): UseLeaderboardResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["users", "leaderboard"],
    queryFn: async (): Promise<SafeUserInfo[]> => {
      const result = await getUsers();
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
  });

  const allRankings = useMemo<LeaderboardEntry[]>(() => {
    return [...(data ?? [])]
      .filter(
        (u) =>
          filters.gameType === null ||
          (u.tournaments ?? []).some((t) => t.gameType === filters.gameType),
      )
      .map((u) => ({ user: u, points: getPointsInRange(u, filters.dateRange), rank: 0 }))
      .filter((e) => e.points > 0 || filters.dateRange === "all")
      .sort(
        (left, right) =>
          right.points - left.points || left.user.username.localeCompare(right.user.username),
      )
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [data, filters]);

  const rankings = useMemo<LeaderboardEntry[]>(
    () => (filters.limit ? allRankings.slice(0, filters.limit) : allRankings),
    [allRankings, filters.limit],
  );

  const currentUserEntry =
    allRankings.find((entry) => entry.user.username === currentUsername) ?? null;
  const errorMessage =
    error instanceof Error ? error.message : error ? "Unable to load leaderboard right now." : null;

  return {
    rankings,
    currentUserEntry,
    isLoading,
    errorMessage,
    isEmpty: !isLoading && !errorMessage && rankings.length === 0,
  };
}
