import type { TournamentListItem } from "@gamenite/shared";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tournamentList } from "../services/tournamentService.ts";
import useLoginContext from "./useLoginContext.ts";

export interface UseTournamentListResult {
  tournaments: TournamentListItem[];
  isLoading: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
}

/**
 * Loads the tournament list and keeps it synchronized with live socket updates.
 */
export default function useTournamentList(): UseTournamentListResult {
  const { socket } = useLoginContext();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["tournaments"],
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async (): Promise<TournamentListItem[]> => {
      const result = await tournamentList();
      if ("error" in result) {
        throw new Error(result.error);
      }

      return result;
    },
  });

  useEffect(() => {
    /**
     * Upserts an updated tournament summary into the cached list.
     */
    const handleTournamentUpdated = (nextTournament: TournamentListItem) => {
      queryClient.setQueryData<TournamentListItem[]>(["tournaments"], (current = []) => {
        const next = [...current];
        const idx = next.findIndex(
          (tournament) => tournament.tournamentId === nextTournament.tournamentId,
        );

        if (idx === -1) {
          next.push(nextTournament);
        } else {
          next[idx] = nextTournament;
        }

        return next.sort(
          (left: TournamentListItem, right: TournamentListItem) =>
            new Date(left.startTime).getTime() - new Date(right.startTime).getTime(),
        );
      });
    };

    socket.on("tournamentUpdated", handleTournamentUpdated);
    return () => {
      socket.off("tournamentUpdated", handleTournamentUpdated);
    };
  }, [queryClient, socket]);

  const tournaments = data ?? [];
  const errorMessage =
    error instanceof Error ? error.message : error ? "Unable to load tournaments right now." : null;

  return {
    tournaments,
    isLoading,
    errorMessage,
    isEmpty: !isLoading && !errorMessage && tournaments.length === 0,
  };
}
