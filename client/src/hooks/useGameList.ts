import type { GameInfo } from "@gamenite/shared";
import { useQuery } from "@tanstack/react-query";
import { gameList } from "../services/gameService.ts";

interface UseGameListResult {
  games: GameInfo[];
  isLoading: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
}

/**
 * Custom hook to get all game summaries.
 * @param maxGames - the maximum number of games desired (default is all of them)
 * @returns query state and list data used by pages to render loading/error/empty states
 */
export default function useGameList(maxGames?: number): UseGameListResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["games"],
    queryFn: async (): Promise<GameInfo[]> => {
      const result = await gameList();
      if ("error" in result) {
        throw new Error(result.error);
      }

      return result;
    },
  });

  const games = maxGames ? (data ?? []).slice(0, maxGames) : (data ?? []);
  const errorMessage =
    error instanceof Error ? error.message : error ? "Unable to load games right now." : null;

  return {
    games,
    isLoading,
    errorMessage,
    isEmpty: !isLoading && !errorMessage && games.length === 0,
  };
}
