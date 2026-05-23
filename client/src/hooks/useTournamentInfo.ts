import type { TournamentInfo } from "@gamenite/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTournamentById } from "../services/tournamentService.ts";

export interface UseTournamentInfoResult {
  tournamentInfo: TournamentInfo | null;
  isLoading: boolean;
  errorMessage: string | null;
  setTournamentInfo: (nextTournament: TournamentInfo) => void;
}

/**
 * Loads one tournament over REST and exposes a setter for updating the cached result.
 */
export default function useTournamentInfo(tournamentId: string): UseTournamentInfoResult {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["tournament", tournamentId],
    enabled: Boolean(tournamentId),
    queryFn: async (): Promise<TournamentInfo> => {
      const result = await getTournamentById(tournamentId);
      if ("error" in result) {
        throw new Error(result.error);
      }

      return result;
    },
  });

  const errorMessage =
    error instanceof Error ? error.message : error ? "Unable to load tournament right now." : null;

  return {
    tournamentInfo: data ?? null,
    isLoading,
    errorMessage,
    setTournamentInfo: (nextTournament: TournamentInfo) => {
      queryClient.setQueryData(["tournament", tournamentId], nextTournament);
    },
  };
}
