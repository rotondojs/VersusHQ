import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useAuth from "./useAuth.ts";
import type { GamePlayInfo, SafeUserInfo, TaggedGameView } from "@gamenite/shared";
import useLoginContext from "./useLoginContext.ts";

interface SocketGameState {
  hasWatched: boolean;
  players: SafeUserInfo[];
  view: TaggedGameView | null;
}

/**
 * Custom hook to manage socket connection for a game
 * @throws if outside a LoginContext
 * @returns an object containing:
 * - `hasWatched`: Boolean that goes from false to true once the server has
 *   acknowledged the socket connection request
 * - `players`: The current list of game players.
 * - `userPlayerIndex`: The index of the current user in the `players` array,
 *   or null if the user is not a player
 * - `view`: The current game view for this user
 * - `joinGame`: Joins the game (if not started)
 * - `startGame`: Start the game (once joined)
 */
export default function useSocketsForGame(gameId: string, initialPlayers: SafeUserInfo[]) {
  const { user, socket } = useLoginContext();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["socket", "game", gameId] as const, [gameId]);

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: Boolean(gameId),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    queryFn: () =>
      new Promise<SocketGameState>((resolve) => {
        /**
         * Resolves the initial watched state for the requested game.
         */
        const handleWatched = (game: GamePlayInfo) => {
          if (game.gameId !== gameId) return;
          socket.off("gameWatched", handleWatched);
          resolve({
            hasWatched: true,
            players: game.players,
            view: game.view,
          });
        };

        socket.on("gameWatched", handleWatched);
        socket.emit("gameWatch", { auth, payload: gameId });
      }),
  });

  const joinMutation = useMutation({
    mutationFn: () => Promise.resolve(socket.emit("gameJoinAsPlayer", { auth, payload: gameId })),
  });

  const startMutation = useMutation({
    mutationFn: () => Promise.resolve(socket.emit("gameStart", { auth, payload: gameId })),
  });

  const players = data?.players ?? initialPlayers;
  const view = data?.view ?? null;
  const hasWatched = data?.hasWatched ?? false;
  const userPlayerIndex = players.findIndex(({ username }) => username === user.username);

  useEffect(() => {
    /**
     * Keeps the cached player list in sync with socket broadcasts.
     */
    const handlePlayersUpdated = (newPlayers: SafeUserInfo[]) => {
      queryClient.setQueryData<SocketGameState | undefined>(queryKey, (current) => {
        if (!current) return current;
        return { ...current, players: newPlayers };
      });
    };

    /**
     * Applies incoming game view updates, preserving player-specific visibility rules.
     */
    const handleStateUpdated = (nextView: TaggedGameView & { forPlayer: boolean }) => {
      if (!nextView) return;
      queryClient.setQueryData<SocketGameState | undefined>(queryKey, (current) => {
        if (!current) return current;
        const currentUserPlayerIndex = current.players.findIndex(
          ({ username }) => username === user.username,
        );
        if (currentUserPlayerIndex >= 0 && !nextView.forPlayer) {
          return current;
        }
        const { forPlayer: _, ...viewPayload } = nextView;
        return { ...current, view: viewPayload as TaggedGameView };
      });
    };

    socket.on("gamePlayersUpdated", handlePlayersUpdated);
    socket.on("gameStateUpdated", handleStateUpdated);

    return () => {
      socket.off("gamePlayersUpdated", handlePlayersUpdated);
      socket.off("gameStateUpdated", handleStateUpdated);
    };
  }, [queryClient, queryKey, socket, user.username]);

  /**
   * Requests to join the game as an active player.
   */
  function joinGame() {
    joinMutation.mutate();
  }

  /**
   * Requests to start the game once it is ready.
   */
  function startGame() {
    startMutation.mutate();
  }

  return {
    hasWatched,
    isLoading,
    players,
    userPlayerIndex,
    view,
    joinGame,
    startGame,
  };
}
