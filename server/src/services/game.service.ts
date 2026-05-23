/**
 * Service-layer helpers for game creation, lifecycle updates, and automated Battleship AI turns.
 */
import {
  type BattleshipState,
  type CreateGameRequest,
  type GameInfo,
  type GameKey,
  type TaggedGameView,
} from "@gamenite/shared";
import { createChat } from "./chat.service.ts";
import { populateSafeUserInfo } from "./user.service.ts";
import { type GameServicer } from "../games/gameServiceManager.ts";
import { nimGameService } from "../games/nim.ts";
import { guessGameService } from "../games/guess.ts";
import {
  battleshipAiUser,
  battleshipGameService,
  chooseBattleshipAiMove,
  isBattleshipAiTurn,
} from "../games/battleship.ts";
import { BATTLESHIP_AI_USER_ID } from "../games/battleshipAIUser.ts";
import { type GameViewUpdates, type UserWithId } from "../types.ts";
import { GameRepo } from "../repository.ts";
import { advanceTournamentWinner } from "./tournament.service.ts";

/**
 * The service interface for individual games
 */
export const gameServices: { [key in GameKey]: GameServicer } = {
  nim: nimGameService,
  guess: guessGameService,
  battleship: battleshipGameService,
};

/**
 * Expand a stored game
 *
 * @param gameId - Valid game id
 * @returns the expanded game info object
 */
async function populateGameInfo(gameId: string): Promise<GameInfo> {
  const game = await GameRepo.get(gameId);
  return {
    gameId,
    createdBy: await populateSafeUserInfo(game.createdBy),
    chat: game.chat,
    createdAt: new Date(game.createdAt),
    players: await Promise.all(game.players.map(populateSafeUserInfo)),
    type: game.type,
    status: !game.state ? "waiting" : game.done ? "done" : "active",
    minPlayers: gameServices[game.type].minPlayers,
    tournamentId: game.tournamentId,
  };
}

/**
 * Create and store a new game
 *
 * @param user - Initial player in the game's waiting room
 * @param request - Requested game type and any mode-specific creation options
 * @param createdAt - Creation time for this game
 * @returns the new game's info object
 */
export async function createGame(
  user: UserWithId,
  request: CreateGameRequest,
  createdAt: Date,
): Promise<GameInfo> {
  const chat = await createChat(createdAt);
  const players =
    request.type === "battleship" && request.opponentType === "ai"
      ? [user.userId, BATTLESHIP_AI_USER_ID]
      : [user.userId];
  const state =
    request.type === "battleship" && request.opponentType === "ai"
      ? gameServices.battleship.create(players).state
      : undefined;
  const gameId = await GameRepo.add({
    type: request.type,
    done: false,
    chat: chat.chatId,
    createdAt: createdAt.toISOString(),
    createdBy: user.userId,
    players,
    state,
  });
  return populateGameInfo(gameId);
}

/**
 * Retrieves a single game from the database. If you expect the id to be valid, use `forceGameById`.
 *
 * @param gameId - Ostensible game id
 * @returns the game's info object, or null
 */
export async function getGameById(gameId: string): Promise<GameInfo | null> {
  const game = await GameRepo.find(gameId);
  if (!game) return null;
  return populateGameInfo(gameId);
}

/**
 * Adds a user to a game that hasn't started yet. If the resulting game object has the maximum
 * allowed number of players, it is the responsibility of the caller to start the game.
 *
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @returns the game's info object, with the `user` listed among the players
 * @throws if the game id is not valid, if the game has started, or if the game cannot accept more
 * players
 */
export async function joinGame(gameId: string, user: UserWithId): Promise<GameInfo> {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} joining invalid game`);
  if (game.state) {
    throw new Error(`user ${user.username} joining game that started`);
  }
  if (game.players.some((userId) => userId === user.userId)) {
    throw new Error(`user ${user.username} joining game they are in already`);
  }
  if (game.players.length === gameServices[game.type].maxPlayers) {
    throw new Error(`user ${user.username} joining full`);
  }

  game.players = [...game.players, user.userId];
  await GameRepo.set(gameId, game);

  return populateGameInfo(gameId);
}

/**
 * Initializes a game that hasn't started yet
 *
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @returns the necessary views for everyone watching the game
 * @throws if the game id is not valid, if the game already started, or if the game lacks enough
 * players to start
 */
export async function startGame(gameId: string, user: UserWithId): Promise<GameViewUpdates> {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} starting invalid game`);
  if (game.state) {
    throw new Error(`user ${user.username} starting game that started`);
  }

  const key: GameKey = game.type;

  if (game.players.length < gameServices[key].minPlayers) {
    throw new Error(`user ${user.username} starting underpopulated game`);
  }
  if (!game.players.some((userId) => userId === user.userId)) {
    throw new Error(`user ${user.username} starting game they're not in`);
  }
  const { state, views } = gameServices[key].create(game.players);

  game.state = state;
  await GameRepo.set(gameId, game);

  return Promise.resolve(views);
}

/**
 * Get a list of all games
 *
 * @returns a list of game summaries, ordered reverse chronologically
 */
export async function getGames(): Promise<GameInfo[]> {
  const keys = await GameRepo.getAllKeys();
  const unsorted = await Promise.all(keys.map(populateGameInfo));

  return unsorted.toSorted((game1, game2) => game2.createdAt.getTime() - game1.createdAt.getTime());
}

/**
 * Represents the result of a game update, including view updates and the
 * move description suffix (the display name is prepended by the caller).
 */
export interface GameUpdateResult {
  views: GameViewUpdates;
  moveDescription: string;
  chatId: string;
}

export interface AutomatedGameUpdateResult extends GameUpdateResult {
  actor: UserWithId;
}

/**
 * Updates a game state and returns the necessary view updates
 *
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @param move - Unsanitized game move
 * @returns the view updates and move description to send to players and watchers
 * @throws if the game id or move is not valid
 */
export async function updateGame(
  gameId: string,
  user: UserWithId,
  move: unknown,
): Promise<GameUpdateResult> {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} acted on an invalid game`);
  if (!game.state) {
    throw new Error(`user ${user.username} made a move in game of that hadn't started`);
  }
  const playerIndex = game.players.findIndex((userId) => userId === user.userId);
  if (playerIndex < 0) {
    throw new Error(`user ${user.username} made a move in a game they weren't playing`);
  }
  const result = gameServices[game.type].update(game.state, move, playerIndex, game.players);
  if (!result) throw new Error(`user ${user.username} made an invalid move in ${game.type}`);

  game.state = result.state;
  game.done = game.done || result.done;
  if (game.done && game.tournamentId) {
    const winnerIndex = gameServices[game.type].getWinner(result.state);
    const winnerUserId = game.players[winnerIndex];
    if (winnerUserId === undefined) {
      throw new Error("Winner index out of bounds");
    }
    await advanceTournamentWinner(game.tournamentId, gameId, winnerUserId, new Date());
  }
  await GameRepo.set(gameId, game);

  return {
    views: result.views,
    moveDescription: result.moveDescription,
    chatId: game.chat,
  };
}

/**
 * View a game as a specific user
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @returns A boolean for whether that user is a player, the player's view, and the list of players
 */
export async function viewGame(gameId: string, user: UserWithId) {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} viewed an invalid game id`);
  const playerIndex = game.players.findIndex((userId) => userId === user.userId);
  let view: TaggedGameView | null = null;
  if (game.state) {
    view = gameServices[game.type].view(game.state, playerIndex);
  }
  return {
    isPlayer: playerIndex >= 0,
    view,
    players: await Promise.all(game.players.map(populateSafeUserInfo)),
  };
}

/**
 * Runs a single Battleship AI turn if the specified game is waiting on the AI player.
 */
export async function runBattleshipAiTurn(
  gameId: string,
): Promise<AutomatedGameUpdateResult | null> {
  const game = await GameRepo.find(gameId);
  if (!game || game.type !== "battleship" || !game.state) {
    return null;
  }

  const state = game.state as BattleshipState;
  if (!isBattleshipAiTurn(state)) {
    return null;
  }

  const aiMove = chooseBattleshipAiMove(state);
  if (!aiMove) {
    return null;
  }

  const actor = battleshipAiUser();
  const playerIndex = game.players.findIndex((userId) => userId === actor.userId);
  if (playerIndex < 0) {
    throw new Error(`AI player missing from battleship game ${gameId}`);
  }

  const result = gameServices.battleship.update(game.state, aiMove, playerIndex, game.players);
  if (!result) {
    throw new Error(`AI generated an invalid move in battleship game ${gameId}`);
  }

  game.state = result.state;
  game.done = game.done || result.done;
  await GameRepo.set(gameId, game);

  return {
    views: result.views,
    moveDescription: result.moveDescription,
    chatId: game.chat,
    actor,
  };
}

/**
 * Creates a tournament-owned game with a predetermined match id.
 */
export async function createTournamentGame(
  gameId: string,
  hostUserId: string,
  type: GameKey,
  playerIds: string[],
  now: Date,
  tournamentId: string,
): Promise<void> {
  const chat = await createChat(now);

  await GameRepo.set(gameId, {
    type,
    done: false,
    chat: chat.chatId,
    createdAt: now.toISOString(),
    createdBy: hostUserId,
    players: playerIds,
    state: null,
    tournamentId,
  });
}
