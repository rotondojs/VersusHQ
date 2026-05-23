/**
 * Display labels used by game and tournament selectors across the client.
 */
import { type GameKey, type TournamentRequestedGameMode } from "@gamenite/shared";

export const gameNames: { [key in GameKey]: string } = {
  nim: "Nim",
  guess: "Number Guesser",
  battleship: "Battleship",
};

export const tournamentGameModeNames: { [key in TournamentRequestedGameMode]: string } = {
  nim: "Nim",
  guess: "Number Guesser",
  battleship: "Battleship",
  random: "Random",
};
