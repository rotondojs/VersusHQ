import { randomUUID } from "node:crypto";
import type {
  BracketNode,
  CreateTournamentRequest,
  EditTournamentRequest,
  GameKey,
  TournamentBracket,
  TournamentInfo,
  TournamentListFilter,
  TournamentListItem,
  TournamentRequestedGameMode,
  TournamentResolvedGameMode,
} from "@gamenite/shared";
import type { BracketNodeRecord, TournamentRecord } from "../models.ts";
import { TournamentRepo } from "../repository.ts";
import {
  addTournamentToUser,
  incrementUserPoints,
  populateSafeUserInfo,
  removeTournamentFromUser,
} from "./user.service.ts";
import type { UserWithId } from "../types.ts";
import { createTournamentGame } from "./game.service.ts";
import { createChat } from "./chat.service.ts";

/**
 * Represent an error for the Tournament Service with a provided message.
 */
export class TournamentServiceError extends Error {
  readonly status: number;

  /**
   * Creates the tournament error.
   * @param status is the status number of the errror
   * @param message is the message of this error
   */
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Resolves a tournament's concrete game mode, deterministically choosing one for random brackets.
 * @param requestedGameMode is the type of game requested
 * @param tournamentId is the id of this tournament to set the gamemode of
 * @returns the type of game for this tournament
 */
function resolveGameMode(
  requestedGameMode: TournamentRequestedGameMode,
  tournamentId: string,
): TournamentResolvedGameMode {
  if (requestedGameMode !== "random") {
    return requestedGameMode;
  }

  const concreteModes: TournamentResolvedGameMode[] = ["nim", "guess", "battleship"];
  const checksum = Array.from(tournamentId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return concreteModes[checksum % concreteModes.length];
}

/**
 * Returns the game mode if it has been implemented for tournament play.
 * @param gameMode is the gamemode being checked
 * @return gameMode as string and throw if not implemented yet
 */
function ensureImplementedTournamentGameMode(gameMode: TournamentResolvedGameMode): GameKey {
  if (gameMode === "nim" || gameMode === "guess" || gameMode === "battleship") {
    return gameMode;
  }

  throw new TournamentServiceError(400, `Unsupported tournament game mode: ${gameMode}`);
}

/**
 * Builds a blank bracket tree for the supplied participant slots.
 * @param participants the participant ids assigned to this portion of the tree
 * @param gameMode the resolved game mode for the tournament
 * @param hostUserId the host who owns all generated games
 * @param now is the current time
 * @return a root bracket with games uninitialized
 */
async function buildBracketNode(
  participants: (string | null)[],
  gameMode: TournamentResolvedGameMode,
  hostUserId: string,
  now: Date,
  tournamentId: string,
  matchNumber: number = 1,
): Promise<BracketNodeRecord> {
  const matchId = randomUUID().toString();

  if (participants.length === 2) {
    return {
      matchId,
      players: [participants[0], participants[1]],
      matchNumber: matchNumber,
    };
  }

  const midpoint = participants.length / 2;
  return {
    matchId,
    players: [null, null],
    matchNumber: matchNumber + 1,
    children: [
      await buildBracketNode(
        participants.slice(0, midpoint),
        gameMode,
        hostUserId,
        now,
        tournamentId,
        matchNumber,
      ),
      await buildBracketNode(
        participants.slice(midpoint),
        gameMode,
        hostUserId,
        now,
        tournamentId,
        matchNumber,
      ),
    ],
  };
}

/**
 * Create a bracket node based on the match record.
 * @param record is the information that returned node should contain
 * @returns the bracket node created from the bracket node record
 */
async function populateBracketNode(record: BracketNodeRecord): Promise<BracketNode> {
  return {
    matchId: record.matchId,
    players: (await Promise.all(
      record.players.map((playerId) =>
        playerId ? populateSafeUserInfo(playerId) : Promise.resolve(null),
      ),
    )) as [BracketNode["players"][0], BracketNode["players"][1]],
    winner: record.winner ? await populateSafeUserInfo(record.winner) : undefined,
    children: record.children
      ? ([
          await populateBracketNode(record.children[0]),
          await populateBracketNode(record.children[1]),
        ] as [BracketNode, BracketNode])
      : undefined,
  };
}

/**
 * Populates and returns a bracket with the inital matchups and games.
 * @param record is the record of the tournament to add the bracket to
 * @param tournamentId is the id of the tournament
 * @returns the bracket root created
 */
async function populateBracket(record: TournamentRecord): Promise<TournamentBracket | null> {
  if (!record.bracket) {
    return null;
  }

  return {
    root: await populateBracketNode(record.bracket.root),
  };
}

/**
 * Returns the record node of the bracket with the match with the provided id or null if not found.
 * @param node is the root node of the bracket
 * @param matchId is the match id of the node to find
 * @return the node with the requested id
 */
function findNode(node: BracketNodeRecord, matchId: string): BracketNodeRecord | null {
  if (node.matchId === matchId) {
    return node;
  }
  if (!node.children) {
    return null;
  }

  return findNode(node.children[0], matchId) ?? findNode(node.children[1], matchId);
}

/**
 * Returns the parent node of the requested match with given id or null if not found.
 * @param node is the root node of the bracket
 * @param targetMatchId is the match id of the requested node
 * @return the bracket node
 */
function findParentNode(node: BracketNodeRecord, targetMatchId: string): BracketNodeRecord | null {
  if (!node.children) {
    return null;
  }
  if (node.children[0].matchId === targetMatchId || node.children[1].matchId === targetMatchId) {
    return node;
  }

  return (
    findParentNode(node.children[0], targetMatchId) ??
    findParentNode(node.children[1], targetMatchId)
  );
}

/**
 * Populates the tournament list item for this tournament to be used on front end.
 * @param tournamentId is the id of the tournament requested
 * @param record is the record of the same tournament
 * @returns the newly populated tournament list item to display on UI
 */
async function populateTournamentListItem(
  tournamentId: string,
  record: TournamentRecord,
): Promise<TournamentListItem> {
  return {
    tournamentId,
    hostUser: await populateSafeUserInfo(record.hostUserId),
    title: record.title,
    creationTime: new Date(record.creationTime),
    startTime: new Date(record.startTime),
    status: record.status,
    requestedGameMode: record.requestedGameMode,
    resolvedGameMode: record.resolvedGameMode,
    maxPlayers: record.maxPlayers,
    participants: await Promise.all(record.participants.map(populateSafeUserInfo)),
    placements: record.placements ?? undefined,
    winner: record.winner ? await populateSafeUserInfo(record.winner) : undefined,
  };
}

/**
 * Lazily creates a chat for older tournament records that predate tournament-wide chat support.
 */
async function ensureTournamentChat(
  tournamentId: string,
  record: TournamentRecord,
): Promise<TournamentRecord> {
  if (record.chat) {
    return record;
  }

  const createdAt = new Date(record.creationTime);
  const chat = await createChat(Number.isNaN(createdAt.getTime()) ? new Date() : createdAt);
  record.chat = chat.chatId;
  await TournamentRepo.set(tournamentId, record);
  return record;
}

/**
 * Populates the tournament to the list and initializes the bracket.
 * @param tournamentId is the id of the tournament requested
 * @param record is the record of the same tournament
 * @returns the newly populated tournament info
 */
async function populateTournamentInfo(
  tournamentId: string,
  record: TournamentRecord,
): Promise<TournamentInfo> {
  const hydratedRecord = await ensureTournamentChat(tournamentId, record);
  return {
    ...(await populateTournamentListItem(tournamentId, hydratedRecord)),
    description: hydratedRecord.description,
    chat: hydratedRecord.chat!,
    bracket: await populateBracket(hydratedRecord),
  };
}

/**
 * Adds the tournament record to the repo.
 * @param tournamentId is the id of the tournament requested
 * @param record is the record of the same tournament
 * @returns the record of the added tournament
 */
async function storeTournamentRecord(
  tournamentId: string,
  record: TournamentRecord,
): Promise<TournamentRecord> {
  await TournamentRepo.set(tournamentId, record);
  return record;
}

/**
 * Takes in a created bracket root node with all null games and then generates
 * the lowest level of games while randomizing the players.
 * @param initialRoot base root of this game
 * @param record is the record for the tournament to extract the participants from
 * @param tournamentId is the id of the tournament
 * @returns the finalize initial bracket node for a tournament
 */
async function generateFirstGames(
  initialRoot: BracketNodeRecord,
  record: TournamentRecord,
  tournamentId: string,
): Promise<BracketNodeRecord> {
  const now = new Date();

  const shuffledPlayers = shuffle(record.participants);
  let index = 0;

  /**
   * Recursively check to fill the main games of the first rounds which are leaves.
   * @param node is the node to create the game for if found to be a leaf
   * @returns a root node with its games set up
   */
  async function fill(node: BracketNodeRecord): Promise<BracketNodeRecord> {
    if (!node.children) {
      const p1 = shuffledPlayers[index++];
      const p2 = shuffledPlayers[index++];

      await createTournamentGame(
        node.matchId,
        record.hostUserId,
        record.resolvedGameMode!,
        [p1, p2],
        now,
        tournamentId,
      );

      return {
        ...node,
        players: [p1, p2],
      };
    }

    return {
      ...node,
      players: [null, null],
      children: [await fill(node.children[0]), await fill(node.children[1])],
    };
  }

  return fill(initialRoot);
}

/**
 * Shuffles an array to randomize the first-round matchups.
 * @param arr to shuffle
 * @returns a shuffled array
 */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Business logic for beginning tournament by creating the bracket with first games.
 * @param tournamentId is the id of this tournament
 * @param record record for this tournament to start
 * @param now is the current time
 * @param allowEarlyStart indicates whether the host may start before the scheduled time
 * @returns the new tournament info with the edit requests made
 */
async function startTournamentInternal(
  tournamentId: string,
  record: TournamentRecord,
  now: Date,
  allowEarlyStart: boolean,
): Promise<TournamentRecord> {
  if (record.status !== "upcoming") {
    throw new TournamentServiceError(400, "Tournament has already started");
  }
  if (record.participants.length !== record.maxPlayers) {
    throw new TournamentServiceError(400, "Tournament bracket is not full yet");
  }
  if (!allowEarlyStart && now.getTime() < new Date(record.startTime).getTime()) {
    throw new TournamentServiceError(400, "Tournament is not eligible to start yet");
  }

  record.placements = Object.fromEntries(
    record.participants.map((participantId) => [participantId, record.maxPlayers]),
  );
  record.status = "ongoing";

  record.resolvedGameMode = resolveGameMode(record.requestedGameMode, tournamentId);

  const rootRecord = await buildBracketNode(
    record.participants,
    record.resolvedGameMode,
    record.hostUserId,
    now,
    tournamentId,
  );
  const filledBracket = await generateFirstGames(rootRecord, record, tournamentId);

  record.bracket = {
    root: filledBracket,
  };

  return storeTournamentRecord(tournamentId, record);
}

/**
 * Start the tournament once the time is past the start time.
 * @param tournamentId is the id of this tournament
 * @param now is the current time
 * @returns the up-to-date tournament record after any automatic lifecycle transition
 */
async function reconcileTournamentLifecycle(
  tournamentId: string,
  now: Date,
): Promise<TournamentRecord> {
  const record = await TournamentRepo.get(tournamentId);
  if (
    record.status === "upcoming" &&
    record.participants.length === record.maxPlayers &&
    now.getTime() >= new Date(record.startTime).getTime()
  ) {
    return startTournamentInternal(tournamentId, record, now, false);
  }

  return record;
}

/**
 * Returns if this user is the host for this tournament.
 * @param record is the record of the tournament being checked
 * @param user is the user to check if they are the host of
 * @returns nothing but will throw if this user is not the host
 */
function ensureHost(record: TournamentRecord, user: UserWithId): void {
  if (record.hostUserId !== user.userId) {
    throw new TournamentServiceError(403, "Only the host can perform this action");
  }
}

/**
 * Returns if the tournment is upcoming and is not ongoing.
 * @param record is the record of the expected tournament
 * @returns nothing but will throw when tournament is not upcoming
 */
function ensureUpcoming(record: TournamentRecord): void {
  if (record.status !== "upcoming") {
    throw new TournamentServiceError(400, "Tournament can only be changed before it starts");
  }
}

/**
 * Creates a new tournament record and registers the host as its first participant.
 * @param user is the user trying to call this function
 * @param request is the request with user specified tournament params
 * @param now is the current time
 * @returns the tournament info that was just created
 */
export async function createTournament(
  user: UserWithId,
  request: CreateTournamentRequest,
  now: Date,
): Promise<TournamentInfo> {
  if (request.startTime.getTime() <= now.getTime()) {
    throw new TournamentServiceError(400, "Tournament start time must be in the future");
  }

  const chat = await createChat(now);
  const record: TournamentRecord = {
    hostUserId: user.userId,
    title: request.title,
    description: request.description,
    creationTime: now.toISOString(),
    startTime: request.startTime.toISOString(),
    chat: chat.chatId,
    status: "upcoming",
    requestedGameMode: request.requestedGameMode,
    maxPlayers: request.maxPlayers,
    participants: [user.userId],
    bracket: null,
    placements: null,
  };

  const tournamentId = await TournamentRepo.add(record);
  await addTournamentToUser(user.userId, tournamentId);
  return populateTournamentInfo(tournamentId, record);
}

/**
 * Deletes a tournament and removes it from every participant's tournament history.
 * @param tournamentId is the id of this tournament
 * @param user is the user trying to call this function
 * @param now is the current time
 * @returns the tournament info that was removed
 */
export async function deleteTournament(
  tournamentId: string,
  user: UserWithId,
  now: Date = new Date(),
): Promise<TournamentInfo> {
  const found = await TournamentRepo.find(tournamentId);
  if (!found) {
    throw new TournamentServiceError(404, "Tournament not found");
  }
  const record = await reconcileTournamentLifecycle(tournamentId, now);
  ensureHost(record, user);

  // Remove this tournament from all users and then delete it from repo
  const info = await populateTournamentInfo(tournamentId, record);
  await Promise.all(
    record.participants.map((participantId) =>
      removeTournamentFromUser(participantId, tournamentId),
    ),
  );

  await TournamentRepo.delete(tournamentId);
  return info;
}

/**
 * Find tournament by provided id from repo and return its info.
 * @param tournamentId the requested id
 * @param now is the current time
 * @returns either the requested tournament info associated or null if not found
 */
export async function getTournamentById(
  tournamentId: string,
  now: Date = new Date(),
): Promise<TournamentInfo | null> {
  const found = await TournamentRepo.find(tournamentId);
  if (!found) {
    return null;
  }

  const record = await reconcileTournamentLifecycle(tournamentId, now);
  return populateTournamentInfo(tournamentId, record);
}

/**
 * Get the list of tournaments that abide by the params of the filter
 * @param filter is which type tournament to filter by
 * @param now is the current time
 * @returns the new list of tournament list items to show to users basic info
 */
export async function getTournamentList(
  filter: TournamentListFilter,
  now: Date = new Date(),
): Promise<TournamentListItem[]> {
  const tournamentIds = await TournamentRepo.getAllKeys();
  const populated = await Promise.all(
    tournamentIds.map(async (tournamentId) => {
      const record = await reconcileTournamentLifecycle(tournamentId, now);
      return populateTournamentListItem(tournamentId, record);
    }),
  );

  return populated
    .filter((tournament) => {
      if (filter?.status && tournament.status !== filter.status) {
        return false;
      }
      if (filter?.hostUsername && tournament.hostUser.username !== filter.hostUsername) {
        return false;
      }
      return true;
    })
    .toSorted((left, right) => left.startTime.getTime() - right.startTime.getTime());
}

/**
 * Edits this tournament with the request information and returns it.
 * @param tournamentId is the id of this tournament
 * @param user is the user trying to call this function
 * @param update is the request that holds the information that should be changed
 * @param now is the current time
 * @returns the new tournament info with the edit requests made
 */
export async function editTournament(
  tournamentId: string,
  user: UserWithId,
  update: EditTournamentRequest,
  now: Date = new Date(),
): Promise<TournamentInfo> {
  const found = await TournamentRepo.find(tournamentId);
  if (!found) {
    throw new TournamentServiceError(404, "Tournament not found");
  }

  const record = await reconcileTournamentLifecycle(tournamentId, now);
  ensureHost(record, user);
  ensureUpcoming(record);

  if (update.maxPlayers !== undefined && update.maxPlayers < record.participants.length) {
    throw new TournamentServiceError(400, "maxPlayers cannot be smaller than the current field");
  }

  if (update.title !== undefined) {
    record.title = update.title;
  }
  if (update.description !== undefined) {
    record.description = update.description;
  }
  if (update.startTime !== undefined) {
    record.startTime = update.startTime.toISOString();
  }
  if (update.requestedGameMode !== undefined) {
    record.requestedGameMode = update.requestedGameMode;
  }
  if (update.maxPlayers !== undefined) {
    record.maxPlayers = update.maxPlayers;
  }

  await storeTournamentRecord(tournamentId, record);
  const updatedRecord = await reconcileTournamentLifecycle(tournamentId, now);
  return populateTournamentInfo(tournamentId, updatedRecord);
}

/**
 * Adds player to the tournament and to their competed tournaments.
 * @param tournamentId is the id of this tournament
 * @param user is the user trying to call this function
 * @param now is the current time
 * @returns the new tournament info with the player added
 */
export async function joinTournament(
  tournamentId: string,
  user: UserWithId,
  now: Date = new Date(),
): Promise<TournamentInfo> {
  const found = await TournamentRepo.find(tournamentId);
  if (!found) {
    throw new TournamentServiceError(404, "Tournament not found");
  }

  const record = await reconcileTournamentLifecycle(tournamentId, now);
  ensureUpcoming(record);

  if (record.participants.includes(user.userId)) {
    throw new TournamentServiceError(400, "User is already in this tournament");
  }
  if (record.participants.length >= record.maxPlayers) {
    throw new TournamentServiceError(400, "Tournament is already full");
  }

  record.participants = [...record.participants, user.userId];
  await storeTournamentRecord(tournamentId, record);
  await addTournamentToUser(user.userId, tournamentId);

  const updatedRecord =
    record.participants.length === record.maxPlayers &&
    now.getTime() >= new Date(record.startTime).getTime()
      ? await startTournamentInternal(tournamentId, record, now, false)
      : record;

  return populateTournamentInfo(tournamentId, updatedRecord);
}

/**
 * Removes player from the tournament and remove it from their tournaments list.
 * @param tournamentId is the id of this tournament
 * @param user is the user trying to call this function
 * @param now is the current time
 * @returns the new tournament info with the player removed
 */
export async function leaveTournament(
  tournamentId: string,
  user: UserWithId,
  now: Date = new Date(),
): Promise<TournamentInfo> {
  const found = await TournamentRepo.find(tournamentId);
  if (!found) {
    throw new TournamentServiceError(404, "Tournament not found");
  }

  const record = await reconcileTournamentLifecycle(tournamentId, now);
  ensureUpcoming(record);

  if (record.hostUserId === user.userId) {
    throw new TournamentServiceError(400, "Hosts must cancel the tournament instead of leaving");
  }
  if (!record.participants.includes(user.userId)) {
    throw new TournamentServiceError(400, "User is not part of this tournament");
  }

  record.participants = record.participants.filter(
    (participantId) => participantId !== user.userId,
  );
  await storeTournamentRecord(tournamentId, record);
  await removeTournamentFromUser(user.userId, tournamentId);
  return populateTournamentInfo(tournamentId, record);
}

/**
 * Kicks the provided player from a provided tournament.
 * @param tournamentId is the id of this tournament
 * @param user is user trying to call this function; has to be the host
 * @param targetUser is the user that should be removed from the tournament
 * @param now is the current time
 * @returns the new tournament info without the kicked player
 */
export async function kickPlayer(
  tournamentId: string,
  user: UserWithId,
  targetUser: string,
  now: Date = new Date(),
): Promise<TournamentInfo> {
  const found = await TournamentRepo.find(tournamentId);
  if (!found) throw new TournamentServiceError(404, "Tournament not found");

  const record = await reconcileTournamentLifecycle(tournamentId, now);

  ensureHost(record, user);
  ensureUpcoming(record);

  const populatedParticipants = await Promise.all(
    record.participants.map((p) => populateSafeUserInfo(p)),
  );

  const kickedPlayerIndex = populatedParticipants.findIndex(
    (participant) => participant.username === targetUser,
  );
  if (kickedPlayerIndex < 0) {
    throw new TournamentServiceError(400, "User is not part of this tournament");
  }

  const kickedPlayerId = record.participants[kickedPlayerIndex];
  const newParticipantList = record.participants.filter((_, i) => i !== kickedPlayerIndex);

  record.participants = newParticipantList;
  await storeTournamentRecord(tournamentId, record);
  await removeTournamentFromUser(kickedPlayerId, tournamentId);

  return populateTournamentInfo(tournamentId, record);
}

/**
 * Cancel a tournament by setting status to cancelled and removing participants.
 * @param tournamentId is the id of this tournament
 * @param user is the user trying to call this function
 * @param now is the current time
 * @returns the new tournament info with the status set as cancelled
 */
export async function cancelTournament(
  tournamentId: string,
  user: UserWithId,
  now: Date = new Date(),
): Promise<TournamentInfo> {
  const found = await TournamentRepo.find(tournamentId);
  if (!found) {
    throw new TournamentServiceError(404, "Tournament not found");
  }

  const record = await reconcileTournamentLifecycle(tournamentId, now);
  ensureHost(record, user);
  ensureUpcoming(record);

  record.status = "cancelled";
  await storeTournamentRecord(tournamentId, record);

  // Remove that the each signed up player participated in this tournament
  await Promise.all(
    record.participants.map((participantId) =>
      removeTournamentFromUser(participantId, tournamentId),
    ),
  );

  return populateTournamentInfo(tournamentId, record);
}

/**
 * Starts tournament by updating record with start time.
 * @param tournamentId is the id of this tournament
 * @param user is the host user of this tournament
 * @param now is the current time of this tournament
 * @returns a populated tournament info object for the started bracket
 */
export async function startTournament(
  tournamentId: string,
  user: UserWithId,
  now: Date = new Date(),
): Promise<TournamentInfo> {
  const found = await TournamentRepo.find(tournamentId);
  if (!found) {
    throw new TournamentServiceError(404, "Tournament not found");
  }

  const record = await TournamentRepo.get(tournamentId);
  ensureHost(record, user);
  const updatedRecord = await startTournamentInternal(tournamentId, record, now, true);
  return populateTournamentInfo(tournamentId, updatedRecord);
}

/**
 * Advances the winner of a completed bracket match and starts the next match when both players are known.
 */
export async function advanceTournamentWinner(
  tournamentId: string,
  completedMatchId: string,
  winnerUserId: string,
  now: Date = new Date(),
): Promise<TournamentInfo> {
  const record = await TournamentRepo.get(tournamentId);
  if (!record.bracket || !record.placements) {
    throw new TournamentServiceError(400, "Tournament has no bracket");
  }
  const completedNode = findNode(record.bracket.root, completedMatchId);
  if (!completedNode) {
    throw new TournamentServiceError(404, "Match not found in bracket");
  }
  completedNode.winner = winnerUserId;
  record.placements[winnerUserId] = Math.min(
    record.placements[winnerUserId],
    record.participants.length / Math.pow(2, completedNode.matchNumber),
  );

  if (record.bracket.root.matchId === completedMatchId) {
    record.status = "completed";
    record.winner = winnerUserId;
    await storeTournamentRecord(tournamentId, record);
    await Promise.all(
      Object.entries(record.placements).map(([userId, placement]) =>
        incrementUserPoints(
          userId,
          Math.round((record.participants.length / Math.max(placement, 1)) * 100),
        ),
      ),
    );
    return populateTournamentInfo(tournamentId, record);
  }
  const parent = findParentNode(record.bracket.root, completedMatchId);
  if (!parent) {
    throw new TournamentServiceError(500, "Could not find parent match");
  }

  const slotIndex = parent.children![0].matchId === completedMatchId ? 0 : 1;
  parent.players[slotIndex] = winnerUserId;
  const otherSlot = parent.players[slotIndex === 0 ? 1 : 0];
  if (otherSlot !== null) {
    await createTournamentGame(
      parent.matchId,
      record.hostUserId,
      ensureImplementedTournamentGameMode(record.resolvedGameMode!),
      [winnerUserId, otherSlot],
      now,
      tournamentId,
    );
  }
  await storeTournamentRecord(tournamentId, record);
  return populateTournamentInfo(tournamentId, record);
}
