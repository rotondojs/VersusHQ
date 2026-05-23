/**
 * Manages the new-game form, including the extra Battleship opponent selection.
 */
import type { BattleshipOpponentType, CreateGameRequest, GameKey } from "@gamenite/shared";
import { type ChangeEvent, useState, type SubmitEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import useAuth from "./useAuth.ts";
import { useNavigate } from "react-router-dom";
import { createGame } from "../services/gameService.ts";

/**
 * Custom hook to manage game creation form logic
 * @throws if outside a LoginContext
 * @returns an object containing
 *  - Form value `gameKey`
 *  - Form value `opponentType` for Battleship
 *  - Possibly-null error message `err`
 *  - Form handlers `handleGameChange`, `handleOpponentTypeChange`, and `handleSubmit`
 */
export default function useNewGameForm() {
  const [gameKey, setGameKey] = useState<GameKey | "">("");
  const [opponentType, setOpponentType] = useState<BattleshipOpponentType | "">("");
  const [err, setErr] = useState<string | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();
  const createGameMutation = useMutation({
    mutationFn: async (request: CreateGameRequest) => {
      const game = await createGame(auth, request);
      if ("error" in game) {
        throw new Error(game.error);
      }
      return game;
    },
    onSuccess: (game) => {
      navigate(`/game/${game.gameId}`);
    },
  });

  /**
   * Updates the selected game mode and clears Battleship-only state when needed.
   */
  const handleGameChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setErr(null);

    // type assertion is safe because NewGame.tsx only allows selection of
    // valid game keys
    const nextGameKey = e.target.value as GameKey | "";
    setGameKey(nextGameKey);
    if (nextGameKey !== "battleship") {
      setOpponentType("");
    }
  };

  /**
   * Updates the Battleship opponent-type selection.
   */
  const handleOpponentTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setErr(null);
    setOpponentType(e.target.value as BattleshipOpponentType | "");
  };

  /**
   * Validates and submits the new-game request.
   */
  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (gameKey === "") {
      setErr("Please select a game");
      return;
    }

    let request: CreateGameRequest;
    if (gameKey === "battleship") {
      if (opponentType === "") {
        setErr("Please select an opponent type");
        return;
      }
      request = { type: "battleship", opponentType };
    } else {
      request = { type: gameKey };
    }

    setErr(null);
    try {
      await createGameMutation.mutateAsync(request);
    } catch (caughtError) {
      setErr(
        caughtError instanceof Error ? caughtError.message : "Unable to create game right now.",
      );
    }
  };

  return {
    gameKey,
    opponentType,
    err,
    isSubmitting: createGameMutation.isPending,
    handleGameChange,
    handleOpponentTypeChange,
    handleSubmit,
  };
}
