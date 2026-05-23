import { useEffect, useState } from "react";
import useAuth from "./useAuth.ts";
import useLoginContext from "./useLoginContext.ts";
import type { TournamentInfo } from "@gamenite/shared";

export interface UseSocketsForTournamentResult {
  tournament: TournamentInfo | null;
  isLoading: boolean;
  errorMessage: string | null;
  setTournament: (nextTournament: TournamentInfo) => void;
}

interface TournamentSocketState {
  tournamentId: string;
  tournament: TournamentInfo | null;
}

/**
 * Watches a tournament over sockets and keeps the latest payload in local state.
 */
export default function useSocketsForTournament(
  tournamentId: string,
): UseSocketsForTournamentResult {
  const { socket } = useLoginContext();
  const auth = useAuth();
  const [state, setState] = useState<TournamentSocketState>({
    tournamentId: "",
    tournament: null,
  });

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    /**
     * Stores the initial tournament payload returned by the watch request.
     */
    const handleWatched = (info: TournamentInfo) => {
      if (info.tournamentId !== tournamentId) return;
      setState({ tournamentId, tournament: info });
    };

    /**
     * Replaces the local tournament state when the server broadcasts an update.
     */
    const handleUpdated = (info: TournamentInfo) => {
      if (info.tournamentId !== tournamentId) return;
      setState({ tournamentId, tournament: info });
    };

    socket.on("tournamentWatched", handleWatched);
    socket.on("tournamentUpdated", handleUpdated);
    socket.emit("tournamentWatch", { auth, payload: tournamentId });

    return () => {
      socket.off("tournamentWatched", handleWatched);
      socket.off("tournamentUpdated", handleUpdated);
      socket.emit("tournamentUnwatch", { auth, payload: tournamentId });
    };
  }, [tournamentId, socket, auth]);

  return {
    tournament: state.tournamentId === tournamentId ? state.tournament : null,
    isLoading: Boolean(tournamentId) && state.tournamentId !== tournamentId,
    errorMessage: null,
    setTournament: (nextTournament: TournamentInfo) => {
      setState({ tournamentId: nextTournament.tournamentId, tournament: nextTournament });
    },
  };
}
