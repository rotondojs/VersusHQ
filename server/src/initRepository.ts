import { randomUUID } from "node:crypto";
import { getUserByUsername } from "./services/auth.service.ts";
import {
  AuthRepo,
  ChatRepo,
  CommentRepo,
  GameRepo,
  MessageRepo,
  TournamentRepo,
  ThreadRepo,
  UserRepo,
} from "./repository.ts";
import type { BracketNodeRecord, GameRecord, ThreadRecord, TournamentRecord } from "./models.ts";
import { createChat } from "./services/chat.service.ts";
import { addTournamentToUser, createUser, updateUser } from "./services/user.service.ts";

/**
 * Builds a simple seeded bracket tree for the default tournament data.
 */
function makeBracket(participants: string[], matchNumber: number = 1): BracketNodeRecord {
  if (participants.length === 2) {
    return {
      matchNumber: matchNumber,
      matchId: randomUUID().toString(),
      players: [participants[0], participants[1]],
    };
  }

  const midpoint = participants.length / 2;
  return {
    matchId: randomUUID().toString(),
    matchNumber: matchNumber + 1,
    players: [null, null],
    children: [
      makeBracket(participants.slice(0, midpoint), matchNumber),
      makeBracket(participants.slice(midpoint), matchNumber),
    ],
  };
}

/** Reset stored games with example data. */
async function resetStoredGames() {
  const user0id = (await getUserByUsername("user0"))!.userId;
  const user1id = (await getUserByUsername("user1"))!.userId;
  const user2id = (await getUserByUsername("user2"))!.userId;
  const user3id = (await getUserByUsername("user3"))!.userId;

  const recently = new Date(new Date().getTime() - 6 * 60 * 60 * 1000);
  const storedGames: { [key: string]: GameRecord } = {
    [randomUUID().toString()]: {
      type: "nim",
      state: { remaining: 0, nextPlayer: 1 },
      done: true,
      chat: (await createChat(new Date("2025-04-21"))).chatId,
      players: [user2id, user3id],
      createdAt: new Date("2025-04-21").toISOString(),
      createdBy: user2id,
    },
    [randomUUID().toString()]: {
      type: "guess",
      state: { secret: 43, guesses: [null, 2, 99, null] },
      done: false,
      chat: (await createChat(recently)).chatId,
      players: [user1id, user0id, user3id, user2id],
      createdAt: recently.toISOString(),
      createdBy: user1id,
    },
    [randomUUID().toString()]: {
      type: "nim",
      done: false,
      chat: (await createChat(new Date())).chatId,
      players: [user1id],
      createdAt: new Date().toISOString(),
      createdBy: user1id,
    },
  };

  await GameRepo.clear();
  await Promise.all(Object.entries(storedGames).map(([id, entry]) => GameRepo.set(id, entry)));
}

/** Reset stored tournaments with example data. */
async function resetStoredTournaments() {
  const user0id = (await getUserByUsername("user0"))!.userId;
  const user1id = (await getUserByUsername("user1"))!.userId;
  const user2id = (await getUserByUsername("user2"))!.userId;
  const user3id = (await getUserByUsername("user3"))!.userId;

  const now = new Date();
  const soon = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const earlierToday = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const storedTournaments: { [key: string]: TournamentRecord } = {
    "tournament-upcoming-0001": {
      hostUserId: user0id,
      title: "Spring Nim Open",
      description: "Single-elimination Nim bracket for the weekend.",
      creationTime: now.toISOString(),
      startTime: soon,
      chat: (await createChat(now)).chatId,
      status: "upcoming",
      requestedGameMode: "nim",
      maxPlayers: 4,
      participants: [user0id, user1id],
      bracket: null,
      placements: null,
    },
    "tournament-ongoing-0001": {
      hostUserId: user1id,
      title: "Guess Gauntlet",
      description: "A full guess bracket that started earlier today.",
      creationTime: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      startTime: earlierToday,
      chat: (await createChat(new Date(now.getTime() - 24 * 60 * 60 * 1000))).chatId,
      status: "ongoing",
      requestedGameMode: "guess",
      resolvedGameMode: "guess",
      maxPlayers: 4,
      participants: [user1id, user0id, user3id, user2id],
      bracket: {
        root: makeBracket([user1id, user0id, user3id, user2id], 1),
      },
      placements: null,
    },
    "tournament-completed-0001": {
      hostUserId: user2id,
      title: "Retro Random Cup",
      description: "Archived tournament for completed-history views.",
      creationTime: lastWeek,
      startTime: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      chat: (await createChat(new Date(lastWeek))).chatId,
      status: "completed",
      requestedGameMode: "random",
      resolvedGameMode: "nim",
      maxPlayers: 4,
      participants: [user2id, user3id, user0id, user1id],
      bracket: {
        root: {
          matchId: randomUUID().toString(),
          players: [user2id, user0id],
          winner: user2id,
          matchNumber: 2,
          children: [
            {
              matchId: randomUUID().toString(),
              players: [user2id, user3id],
              winner: user2id,
              matchNumber: 1,
            },
            {
              matchId: randomUUID().toString(),
              players: [user0id, user1id],
              winner: user0id,
              matchNumber: 1,
            },
          ],
        },
      },
      winner: user2id,
      placements: {
        [user2id]: 1,
        [user0id]: 2,
        [user3id]: 3,
        [user1id]: 4,
      },
    },
    "tournament-completed-0002": {
      hostUserId: user0id,
      title: "Evening Nim Finals",
      description: "Second archived tournament so profile charts have multiple data points.",
      creationTime: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      startTime: new Date(now.getTime() - 3.5 * 24 * 60 * 60 * 1000).toISOString(),
      chat: (await createChat(new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000))).chatId,
      status: "completed",
      requestedGameMode: "nim",
      resolvedGameMode: "nim",
      maxPlayers: 4,
      participants: [user0id, user1id, user2id, user3id],
      bracket: {
        root: {
          matchId: randomUUID().toString(),
          players: [user1id, user2id],
          winner: user1id,
          matchNumber: 2,
          children: [
            {
              matchId: randomUUID().toString(),
              players: [user0id, user1id],
              winner: user1id,
              matchNumber: 1,
            },
            {
              matchId: randomUUID().toString(),
              players: [user2id, user3id],
              winner: user2id,
              matchNumber: 1,
            },
          ],
        },
      },
      winner: user1id,
      placements: {
        [user1id]: 1,
        [user2id]: 2,
        [user0id]: 3,
        [user3id]: 4,
      },
    },
  };

  await TournamentRepo.clear();
  await Promise.all(
    Object.entries(storedTournaments).map(([id, entry]) => TournamentRepo.set(id, entry)),
  );

  await Promise.all(
    Object.entries(storedTournaments).flatMap(([id, entry]) =>
      entry.participants.map((participantId) => addTournamentToUser(participantId, id)),
    ),
  );
}

/** Reset stored threads with example data */
async function resetStoredThreads() {
  const user0id = (await getUserByUsername("user0"))!.userId;
  const user1id = (await getUserByUsername("user1"))!.userId;
  const user2id = (await getUserByUsername("user2"))!.userId;
  const user3id = (await getUserByUsername("user3"))!.userId;

  const storedThreads: { [key: string]: ThreadRecord } = {
    abadcafeabadcafeabadcafe: {
      createdBy: user1id,
      createdAt: new Date().toISOString(),
      title: "Nim?",
      text: "Is anyone around that wants to play Nim? I'll be here for the next hour or so.",
      comments: [],
    },
    deadbeefdeadbeefdeadbeef: {
      createdBy: user1id,
      createdAt: new Date("2025-04-02").toISOString(),
      title: "Hello game knights",
      text: "I'm a big Nim buff and am excited to join this community.",
      comments: [],
    },
    [randomUUID().toString()]: {
      createdBy: user3id,
      createdAt: new Date(new Date().getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      title: "Other games?",
      text: "Nim is great, but I'm hoping some new strategy games will get introduced soon.",
      comments: [],
    },
    [randomUUID().toString()]: {
      createdBy: user2id,
      createdAt: new Date("2025-04-04").toISOString(),
      title: "Strategy guide?",
      text: "I'm pretty confused about the right strategy for Nim, is there anyone around who can help explain this?",
      comments: [],
    },
    [randomUUID().toString()]: {
      createdBy: user0id,
      createdAt: new Date(new Date().getTime() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
      title: "New game: multiplayer number guesser!",
      text: "Strategy.town now has an exciting new game: guess! Try it out today: multiple people can join this exciting game, and guess a number between 1 and 100!",
      comments: [],
    },
  };
  await ThreadRepo.clear();
  await Promise.all(Object.entries(storedThreads).map(([id, entry]) => ThreadRepo.set(id, entry)));
}

/** Reset stored users with example data */
async function resetStoredUsers() {
  await UserRepo.clear();

  await createUser("user0", new Date(), "pwd0000");
  await createUser("user1", new Date(), "pwd1111");
  await createUser("user2", new Date(), "pwd2222");
  await createUser("user3", new Date(), "pwd3333");

  await updateUser("user0", { display: "The Knight Of Games", lastLogin: new Date() });
  await updateUser("user1", { display: "Yāo", lastLogin: new Date() });
  await updateUser("user2", { display: "Sénior Dos", lastLogin: new Date() });
  await updateUser("user3", { display: "Frau Drei", lastLogin: new Date() });
}

/**
 * Clears every repository and repopulates the app with its default seed data.
 */
export async function resetEverythingToDefaults() {
  await AuthRepo.clear();
  await ChatRepo.clear();
  await CommentRepo.clear();
  await GameRepo.clear();
  await MessageRepo.clear();
  await TournamentRepo.clear();
  await ThreadRepo.clear();
  await UserRepo.clear();

  await resetStoredUsers();
  await resetStoredTournaments();
  await resetStoredThreads();
  await resetStoredGames();
}
