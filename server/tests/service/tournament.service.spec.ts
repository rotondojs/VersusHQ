import { describe, expect, it, vi } from "vitest";
import { enforceAuth } from "../../src/services/auth.service.ts";
import {
  advanceTournamentWinner,
  createTournament,
  deleteTournament,
  editTournament,
  getTournamentById,
  getTournamentList,
  joinTournament,
  kickPlayer,
  startTournament,
} from "../../src/services/tournament.service.ts";
import { startGame, updateGame } from "../../src/services/game.service.ts";
import { GameRepo, TournamentRepo, UserRepo } from "../../src/repository.ts";
import type { UserWithId } from "../../src/types.ts";
import { randomUUID } from "node:crypto";

const auth0 = { username: "user0", password: "pwd0000" };
const auth1 = { username: "user1", password: "pwd1111" };
const auth2 = { username: "user2", password: "pwd2222" };
const auth3 = { username: "user3", password: "pwd3333" };

async function finishNimGameWithSecondPlayerWinning(
  gameId: string,
  firstPlayer: UserWithId,
  secondPlayer: UserWithId,
): Promise<void> {
  const game = await GameRepo.get(gameId);
  const playersById = Object.fromEntries([
    [firstPlayer.userId, firstPlayer],
    [secondPlayer.userId, secondPlayer],
  ]);
  const gamePlayers = game.players.map((userId) => {
    const player = playersById[userId];
    if (!player) {
      throw new Error(`Unknown player ${userId} in game ${gameId}`);
    }
    return player;
  });

  await startGame(gameId, gamePlayers[0]);

  if (gamePlayers[1].userId === secondPlayer.userId) {
    for (let moveCount = 0; moveCount < 21; moveCount += 1) {
      const currentPlayer = gamePlayers[moveCount % 2];
      await updateGame(gameId, currentPlayer, 1);
    }
    return;
  }

  await updateGame(gameId, gamePlayers[0], 2);
  for (let moveCount = 0; moveCount < 19; moveCount += 1) {
    const currentPlayer = gamePlayers[(moveCount + 1) % 2];
    await updateGame(gameId, currentPlayer, 1);
  }
}

describe("tournament placement progression", () => {
  it("backfills a tournament chat for legacy records and keeps it stable across updates", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Legacy Chat Backfill",
        description: "Tournament chat should be recreated for legacy records.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 2,
      },
      now,
    );

    const stored = await TournamentRepo.get(created.tournamentId);
    delete stored.chat;
    await TournamentRepo.set(created.tournamentId, stored);

    const joined = await joinTournament(created.tournamentId, player1, now);
    expect(joined.chat).toEqual(expect.any(String));

    const afterJoin = await TournamentRepo.get(created.tournamentId);
    expect(afterJoin.chat).toBe(joined.chat);

    const started = await startTournament(created.tournamentId, host, now);
    expect(started.chat).toBe(joined.chat);
  });

  it("sets each player's placement to maxPlayers when the tournament starts", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Placement Init",
        description: "Placement should initialize to maxPlayers.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 2,
      },
      now,
    );

    await joinTournament(created.tournamentId, player1, now);
    await startTournament(created.tournamentId, host, now);

    const record = await TournamentRepo.get(created.tournamentId);
    expect(record.placements).toStrictEqual({
      [host.userId]: 2,
      [player1.userId]: 2,
    });
  });

  it("updates placements by round with no byes in a 4-player bracket", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const player2 = await enforceAuth(auth2);
    const player3 = await enforceAuth(auth3);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Placement Progression",
        description: "Round-by-round placement updates in a full bracket.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 4,
      },
      now,
    );

    await joinTournament(created.tournamentId, player1, now);
    await joinTournament(created.tournamentId, player2, now);
    await joinTournament(created.tournamentId, player3, now);

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      await startTournament(created.tournamentId, host, now);
    } finally {
      randomSpy.mockRestore();
    }

    let record = await TournamentRepo.get(created.tournamentId);
    expect(record.placements).toStrictEqual({
      [host.userId]: 4,
      [player1.userId]: 4,
      [player2.userId]: 4,
      [player3.userId]: 4,
    });

    const leftSemifinalMatchId = record.bracket!.root.children![0].matchId;
    const rightSemifinalMatchId = record.bracket!.root.children![1].matchId;

    await finishNimGameWithSecondPlayerWinning(leftSemifinalMatchId, host, player1);
    record = await TournamentRepo.get(created.tournamentId);
    expect(record.placements).toStrictEqual({
      [host.userId]: 4,
      [player1.userId]: 2,
      [player2.userId]: 4,
      [player3.userId]: 4,
    });

    await finishNimGameWithSecondPlayerWinning(rightSemifinalMatchId, player2, player3);
    record = await TournamentRepo.get(created.tournamentId);
    expect(record.placements).toStrictEqual({
      [host.userId]: 4,
      [player1.userId]: 2,
      [player2.userId]: 4,
      [player3.userId]: 2,
    });

    const finalMatchId = record.bracket!.root.matchId;
    await finishNimGameWithSecondPlayerWinning(finalMatchId, player1, player3);

    record = await TournamentRepo.get(created.tournamentId);
    expect(record.status).toBe("completed");
    expect(record.winner).toBe(player3.userId);
    expect(record.placements).toStrictEqual({
      [host.userId]: 4,
      [player1.userId]: 2,
      [player2.userId]: 4,
      [player3.userId]: 1,
    });

    const hostRecord = await UserRepo.get(host.userId);
    const player1Record = await UserRepo.get(player1.userId);
    const player2Record = await UserRepo.get(player2.userId);
    const player3Record = await UserRepo.get(player3.userId);
    expect(hostRecord.points).toBe(100);
    expect(player1Record.points).toBe(200);
    expect(player2Record.points).toBe(100);
    expect(player3Record.points).toBe(400);
  });

  it("keeps an explicitly requested game mode when the tournament starts", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Explicit Game Mode",
        description: "Non-random game modes should be preserved.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "guess",
        maxPlayers: 2,
      },
      now,
    );

    await joinTournament(created.tournamentId, player1, now);
    const started = await startTournament(created.tournamentId, host, now);

    expect(started.requestedGameMode).toBe("guess");
    expect(started.resolvedGameMode).toBe("guess");
  });

  it("automatically starts a full tournament when read after its scheduled start", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const createdAt = new Date();
    const startTime = new Date(createdAt.getTime() + 5 * 60 * 1000);

    const created = await createTournament(
      host,
      {
        title: "Scheduled Auto Start",
        description: "Full tournaments should auto-start once their time arrives.",
        startTime,
        requestedGameMode: "nim",
        maxPlayers: 2,
      },
      createdAt,
    );

    await joinTournament(created.tournamentId, player1, createdAt);

    const hydrated = await getTournamentById(
      created.tournamentId,
      new Date(startTime.getTime() + 1000),
    );

    expect(hydrated).toMatchObject({
      tournamentId: created.tournamentId,
      status: "ongoing",
      resolvedGameMode: "nim",
    });
    expect(hydrated?.bracket).not.toBeNull();
  });
});

describe("tournament service error handling", () => {
  it("rejects tournaments that start in the past", async () => {
    const host = await enforceAuth(auth0);
    const now = new Date();

    await expect(
      createTournament(
        host,
        {
          title: "Past Tournament",
          description: "Should not be created.",
          startTime: new Date(now.getTime() - 1),
          requestedGameMode: "nim",
          maxPlayers: 2,
        },
        now,
      ),
    ).rejects.toMatchObject({
      status: 400,
      message: "Tournament start time must be in the future",
    });
  });

  it("rejects duplicate joins and joining a full tournament", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const player2 = await enforceAuth(auth2);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Join Validation",
        description: "Join should reject duplicate and full cases.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 2,
      },
      now,
    );

    await expect(joinTournament(created.tournamentId, host, now)).rejects.toMatchObject({
      status: 400,
      message: "User is already in this tournament",
    });

    await joinTournament(created.tournamentId, player1, now);

    await expect(joinTournament(created.tournamentId, player2, now)).rejects.toMatchObject({
      status: 400,
      message: "Tournament is already full",
    });
  });

  it("rejects starting a tournament as a non-host", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Host Validation",
        description: "Only the host can start the tournament.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 2,
      },
      now,
    );

    await joinTournament(created.tournamentId, player1, now);

    await expect(startTournament(created.tournamentId, player1, now)).rejects.toMatchObject({
      status: 403,
      message: "Only the host can perform this action",
    });
  });

  it("rejects starting a tournament before the bracket is full", async () => {
    const host = await enforceAuth(auth0);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Not Full Yet",
        description: "Starting should fail until every slot is filled.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 2,
      },
      now,
    );

    await expect(startTournament(created.tournamentId, host, now)).rejects.toMatchObject({
      status: 400,
      message: "Tournament bracket is not full yet",
    });
  });

  it("rejects advancing a winner before the tournament bracket exists", async () => {
    const host = await enforceAuth(auth0);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "No Bracket Yet",
        description: "Winner advancement requires a started tournament.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 2,
      },
      now,
    );

    await expect(
      advanceTournamentWinner(created.tournamentId, randomUUID(), host.userId, now),
    ).rejects.toMatchObject({
      status: 400,
      message: "Tournament has no bracket",
    });
  });

  it("rejects advancing a winner for a match that is not in the bracket", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Unknown Match",
        description: "Advancement should fail for invalid match ids.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 2,
      },
      now,
    );

    await joinTournament(created.tournamentId, player1, now);
    await startTournament(created.tournamentId, host, now);

    await expect(
      advanceTournamentWinner(created.tournamentId, randomUUID(), host.userId, now),
    ).rejects.toMatchObject({
      status: 404,
      message: "Match not found in bracket",
    });
  });

  it("rejects advancing into a parent match when the stored resolved mode is unsupported", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const player2 = await enforceAuth(auth2);
    const player3 = await enforceAuth(auth3);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Unsupported Advancement Mode",
        description: "Corrupt resolved modes should fail when creating the next match.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 4,
      },
      now,
    );

    await joinTournament(created.tournamentId, player1, now);
    await joinTournament(created.tournamentId, player2, now);
    await joinTournament(created.tournamentId, player3, now);

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      await startTournament(created.tournamentId, host, now);
    } finally {
      randomSpy.mockRestore();
    }

    let record = await TournamentRepo.get(created.tournamentId);
    const leftSemifinalMatchId = record.bracket!.root.children![0].matchId;
    const rightSemifinalMatchId = record.bracket!.root.children![1].matchId;
    const leftWinnerUserId = record.bracket!.root.children![0].players[1]!;
    const rightWinnerUserId = record.bracket!.root.children![1].players[1]!;

    await advanceTournamentWinner(
      created.tournamentId,
      leftSemifinalMatchId,
      leftWinnerUserId,
      now,
    );

    record = await TournamentRepo.get(created.tournamentId);
    record.resolvedGameMode = "random" as never;
    await TournamentRepo.set(created.tournamentId, record);

    await expect(
      advanceTournamentWinner(created.tournamentId, rightSemifinalMatchId, rightWinnerUserId, now),
    ).rejects.toMatchObject({
      status: 400,
      message: "Unsupported tournament game mode: random",
    });
  });

  it("rejects editing a missing tournament", async () => {
    const host = await enforceAuth(auth0);
    const now = new Date();

    await expect(
      editTournament(
        randomUUID(),
        host,
        {
          title: "Missing",
        },
        now,
      ),
    ).rejects.toMatchObject({
      status: 404,
      message: "Tournament not found",
    });
  });

  it("rejects shrinking maxPlayers below the current participant count", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Shrink Validation",
        description: "Cannot shrink below the number of joined users.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 4,
      },
      now,
    );

    await joinTournament(created.tournamentId, player1, now);

    await expect(
      editTournament(
        created.tournamentId,
        host,
        {
          maxPlayers: 1,
        },
        now,
      ),
    ).rejects.toMatchObject({
      status: 400,
      message: "maxPlayers cannot be smaller than the current field",
    });
  });

  it("rejects editing a tournament after it has already started", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Started Tournament Edit",
        description: "Started tournaments cannot be edited.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 2,
      },
      now,
    );

    await joinTournament(created.tournamentId, player1, now);
    await startTournament(created.tournamentId, host, now);

    await expect(
      editTournament(
        created.tournamentId,
        host,
        {
          title: "Too Late",
        },
        now,
      ),
    ).rejects.toMatchObject({
      status: 400,
      message: "Tournament can only be changed before it starts",
    });
  });
});

describe("tournament lifecycle helpers", () => {
  it("deletes a tournament and removes it from every participant profile", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Delete Tournament",
        description: "Deleting should clean up the repo and user profiles.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 2,
      },
      now,
    );

    await joinTournament(created.tournamentId, player1, now);
    const deleted = await deleteTournament(created.tournamentId, host, now);

    expect(deleted.tournamentId).toBe(created.tournamentId);
    await expect(TournamentRepo.find(created.tournamentId)).resolves.toBeNull();

    const hostRecord = await UserRepo.get(host.userId);
    const playerRecord = await UserRepo.get(player1.userId);
    expect(hostRecord.tournamentIds).not.toContain(created.tournamentId);
    expect(playerRecord.tournamentIds).not.toContain(created.tournamentId);
  });

  it("rejects deleting a missing tournament", async () => {
    const host = await enforceAuth(auth0);
    const now = new Date();

    await expect(deleteTournament(randomUUID(), host, now)).rejects.toMatchObject({
      status: 404,
      message: "Tournament not found",
    });
  });

  it("filters tournament lists by status and host username", async () => {
    const host = await enforceAuth(auth3);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Hosted Filter Target",
        description: "Used to verify tournament list filters.",
        startTime: new Date(now.getTime() + 90 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 2,
      },
      now,
    );

    const completedOnly = await getTournamentList({ status: "completed" }, now);
    const hostedByUser3 = await getTournamentList({ hostUsername: host.username }, now);

    expect(completedOnly.every((tournament) => tournament.status === "completed")).toBe(true);
    expect(
      completedOnly.some((tournament) => tournament.tournamentId === created.tournamentId),
    ).toBe(false);
    expect(
      hostedByUser3.every((tournament) => tournament.hostUser.username === host.username),
    ).toBe(true);
    expect(
      hostedByUser3.some((tournament) => tournament.tournamentId === created.tournamentId),
    ).toBe(true);
  });
});

describe("kickPlayer", () => {
  it("removes the kicked player from the tournament and their profile", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const player2 = await enforceAuth(auth2);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Kick Player",
        description: "Host can remove a participant.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 4,
      },
      now,
    );

    await joinTournament(created.tournamentId, player1, now);
    await joinTournament(created.tournamentId, player2, now);

    const updated = await kickPlayer(created.tournamentId, host, player1.username, now);

    expect(updated.participants.map((participant) => participant.username)).toStrictEqual([
      host.username,
      player2.username,
    ]);

    const record = await TournamentRepo.get(created.tournamentId);
    expect(record.participants).toStrictEqual([host.userId, player2.userId]);

    const kickedPlayerRecord = await UserRepo.get(player1.userId);
    expect(kickedPlayerRecord.tournamentIds).not.toContain(created.tournamentId);
  });

  it("rejects kicks from non-host users", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Kick Permission",
        description: "Only hosts may kick players.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 2,
      },
      now,
    );

    await joinTournament(created.tournamentId, player1, now);

    await expect(
      kickPlayer(created.tournamentId, player1, host.username, now),
    ).rejects.toMatchObject({
      status: 403,
      message: "Only the host can perform this action",
    });
  });

  it("rejects kicking a user who is not in the tournament", async () => {
    const host = await enforceAuth(auth0);
    const player1 = await enforceAuth(auth1);
    const player2 = await enforceAuth(auth2);
    const now = new Date();

    const created = await createTournament(
      host,
      {
        title: "Kick Missing Player",
        description: "Missing tournament users should raise an error.",
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        requestedGameMode: "nim",
        maxPlayers: 3,
      },
      now,
    );

    await joinTournament(created.tournamentId, player1, now);

    await expect(
      kickPlayer(created.tournamentId, host, player2.username, now),
    ).rejects.toMatchObject({
      status: 400,
      message: "User is not part of this tournament",
    });
  });
});
