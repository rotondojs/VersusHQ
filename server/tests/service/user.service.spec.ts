import { describe, expect, it } from "vitest";
import type { TournamentRecord, UserRecord } from "../../src/models.ts";
import { ImageRepo, TournamentRepo, UserRepo } from "../../src/repository.ts";
import { getUserByUsername, enforceAuth } from "../../src/services/auth.service.ts";
import {
  addTournamentToUser,
  getAllUsers,
  getUsersByUsername,
  incrementUserPoints,
  populateSafeUserInfo,
  removeTournamentFromUser,
  updateUser,
  uploadUserPicture,
} from "../../src/services/user.service.ts";

// enforceAuth isn't tested by current integration tests,
// because existing tests exercise the REST api, and enforceAuth
// is only used in the socket api
describe("enforceAuth", () => {
  it("should return a user and id on good auth", async () => {
    const user = await enforceAuth({ username: "user1", password: "pwd1111" });
    expect(user).toStrictEqual({ userId: expect.any(String), username: "user1" });
  });

  it("should raise on bad auth", async () => {
    await expect(enforceAuth({ username: "user1", password: "no" })).rejects.toThrow();
  });
});

// updateUser can't be fully tested by current integration tests; part of its
// contract is that it throws if updateUser is called with an invalid user id,
// but a well-behaved controller won't ever invoke updateUser with an invalid
// user id
describe("updateUser", () => {
  it("should throw if given an invalid user id", async () => {
    await expect(updateUser("fake", { display: "Stacey Fakename" })).rejects.toThrow();
  });

  it("should update optional profile fields that are not exercised by the REST API tests", async () => {
    const lastLogin = new Date("2026-04-09T12:00:00.000Z");

    const updated = await updateUser("user1", {
      email: "user1@example.com",
      picture: "https://example.com/user1.png",
      name: "User One",
      bio: "Prefers long-form strategy games.",
      theme: "forest",
      lastLogin,
    });

    expect(updated).toMatchObject({
      username: "user1",
      display: "Yāo",
      email: "user1@example.com",
      picture: "https://example.com/user1.png",
      name: "User One",
      bio: "Prefers long-form strategy games.",
      theme: "forest",
      lastLogin,
    });
  });
});

describe("populateSafeUserInfo", () => {
  it("should throw if given an invalid user id", async () => {
    await expect(populateSafeUserInfo("fake-user-id")).rejects.toThrow(
      "Failed to find key fake-user-id in repository user",
    );
  });

  it("should default missing persisted user fields without using invalid typed properties", async () => {
    const user = await getUserByUsername("user3");
    const record = await UserRepo.get(user!.userId);
    const sparseRecord = {
      ...record,
      points: undefined,
      lastLogin: undefined,
      bio: 42,
      tournamentIds: undefined,
    } as unknown as UserRecord;

    await UserRepo.set(user!.userId, sparseRecord);

    const safeUser = await populateSafeUserInfo(user!.userId);

    expect(safeUser).toMatchObject({
      username: "user3",
      display: "Frau Drei",
      points: 0,
      createdAt: expect.any(Date),
      lastLogin: undefined,
      bio: undefined,
      tournaments: [],
    });
  });

  it("should fall back for sparse tournament records", async () => {
    const user = await getUserByUsername("user3");
    const host = await getUserByUsername("user0");
    const tournamentId = "user-service-sparse-tournament";
    const tournament = {
      hostUserId: host!.userId,
      title: "Sparse Tournament",
      description: "Covers sparse tournament serialization.",
      creationTime: new Date("2026-04-05T00:00:00.000Z").toISOString(),
      startTime: new Date("2026-04-06T00:00:00.000Z").toISOString(),
      status: "completed",
      requestedGameMode: "guess",
      maxPlayers: 4,
      participants: undefined,
      bracket: null,
      placements: {},
    } as unknown as TournamentRecord;

    await TournamentRepo.set(tournamentId, tournament);

    const record = await UserRepo.get(user!.userId);
    await UserRepo.set(user!.userId, {
      ...record,
      tournamentIds: [tournamentId],
    });

    const safeUser = await populateSafeUserInfo(user!.userId);

    expect(safeUser.tournaments).toStrictEqual([
      {
        tournamentId,
        name: "Sparse Tournament",
        gameType: "guess",
        createdAt: new Date("2026-04-05T00:00:00.000Z"),
        placement: -1,
        participantCount: 0,
        hosted: false,
      },
    ]);
  });

  it("should include tournament summaries and optional profile fields", async () => {
    const user = await getUserByUsername("user2");
    const otherUser = await getUserByUsername("user0");
    const completedTournamentId = "user-service-completed-tournament";
    const upcomingTournamentId = "user-service-upcoming-tournament";

    await updateUser("user2", {
      email: "user2@example.com",
      picture: "https://example.com/user2.png",
      name: "User Two",
      bio: "Enjoys bracket play.",
      theme: "aurora",
    });

    await TournamentRepo.set(completedTournamentId, {
      hostUserId: user!.userId,
      title: "User Service Invitational",
      description: "Completed tournament summary coverage.",
      creationTime: new Date("2026-04-01T00:00:00.000Z").toISOString(),
      startTime: new Date("2026-04-02T00:00:00.000Z").toISOString(),
      status: "completed",
      requestedGameMode: "random",
      resolvedGameMode: "nim",
      maxPlayers: 4,
      participants: [user!.userId, otherUser!.userId],
      bracket: null,
      placements: { [user!.userId]: 1 },
      winner: user!.userId,
    });

    await TournamentRepo.set(upcomingTournamentId, {
      hostUserId: otherUser!.userId,
      title: "Unresolved Guess Cup",
      description: "Upcoming tournament summary coverage.",
      creationTime: new Date("2026-04-03T00:00:00.000Z").toISOString(),
      startTime: new Date("2026-04-04T00:00:00.000Z").toISOString(),
      status: "upcoming",
      requestedGameMode: "guess",
      maxPlayers: 4,
      participants: [user!.userId, otherUser!.userId],
      bracket: null,
      placements: null,
    });

    const userRecord = await UserRepo.get(user!.userId);
    userRecord.tournamentIds = [completedTournamentId, upcomingTournamentId];
    await UserRepo.set(user!.userId, userRecord);

    const safeUser = await populateSafeUserInfo(user!.userId);

    expect(safeUser).toMatchObject({
      username: "user2",
      display: "Sénior Dos",
      points: 0,
      createdAt: expect.any(Date),
      email: "user2@example.com",
      picture: "https://example.com/user2.png",
      name: "User Two",
      bio: "Enjoys bracket play.",
      theme: "aurora",
      lastLogin: expect.any(Date),
    });

    expect(safeUser.tournaments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tournamentId: upcomingTournamentId,
          name: "Unresolved Guess Cup",
          gameType: "guess",
          createdAt: expect.any(Date),
          placement: -1,
          participantCount: 2,
          hosted: false,
        }),
        expect.objectContaining({
          tournamentId: completedTournamentId,
          name: "User Service Invitational",
          gameType: "nim",
          createdAt: expect.any(Date),
          placement: 1,
          participantCount: 2,
          hosted: true,
        }),
      ]),
    );
  });
});

describe("lookup helpers", () => {
  it("should resolve users by username in request order", async () => {
    const users = await getUsersByUsername(["user2", "user0"]);

    expect(users.map((user) => user.username)).toStrictEqual(["user2", "user0"]);
  });

  it("should throw if any requested username does not exist", async () => {
    await expect(getUsersByUsername(["user1", "ghost-user"])).rejects.toThrow("No user ghost-user");
  });

  it("should return all users sorted by username", async () => {
    const users = await getAllUsers();

    expect(users.map((user) => user.username)).toStrictEqual(["user0", "user1", "user2", "user3"]);
  });
});

describe("uploadUserPicture", () => {
  it("should throw if asked to upload for an unknown user", async () => {
    await expect(uploadUserPicture("ghost-user", "image/png", "aGVsbG8=")).rejects.toThrow(
      "No user ghost-user",
    );
  });

  it("should store the image and update the user's picture URL", async () => {
    const updated = await uploadUserPicture("user1", "image/png", "aGVsbG8=");
    const pictureUrl = updated.picture!;
    const imageId = decodeURIComponent(pictureUrl.split("/").at(-1)!);
    const storedImage = await ImageRepo.get(imageId);

    expect(pictureUrl).toMatch(/^\/api\/user\/user1\/picture\//);
    expect(storedImage).toMatchObject({
      mimeType: "image/png",
      base64Data: "aGVsbG8=",
      createdAt: expect.any(String),
    });
  });
});

describe("tournament user bookkeeping", () => {
  it("should initialize a missing tournament list when adding a tournament", async () => {
    const user = await getUserByUsername("user1");
    const record = await UserRepo.get(user!.userId);
    const sparseRecord = {
      ...record,
      tournamentIds: undefined,
    } as unknown as UserRecord;

    await UserRepo.set(user!.userId, sparseRecord);
    await addTournamentToUser(user!.userId, "fresh-tournament");

    expect((await UserRepo.get(user!.userId)).tournamentIds).toStrictEqual(["fresh-tournament"]);
  });

  it("should add and remove tournaments without creating duplicates", async () => {
    const user = await getUserByUsername("user1");
    const userId = user!.userId;

    await addTournamentToUser(userId, "extra-tournament");
    await addTournamentToUser(userId, "extra-tournament");

    let record = await UserRepo.get(userId);
    expect(record.tournamentIds.filter((id) => id === "extra-tournament")).toHaveLength(1);

    await removeTournamentFromUser(userId, "extra-tournament");
    record = await UserRepo.get(userId);
    expect(record.tournamentIds).not.toContain("extra-tournament");

    await removeTournamentFromUser(userId, "extra-tournament");
    expect((await UserRepo.get(userId)).tournamentIds).not.toContain("extra-tournament");
  });

  it("should no-op when removing a tournament that is not present", async () => {
    const user = await getUserByUsername("user1");

    await UserRepo.set(user!.userId, {
      ...(await UserRepo.get(user!.userId)),
      tournamentIds: [],
    });
    await removeTournamentFromUser(user!.userId, "missing-tournament");

    expect((await UserRepo.get(user!.userId)).tournamentIds).toStrictEqual([]);
  });

  it("should throw when adding a tournament to an unknown user", async () => {
    await expect(addTournamentToUser("fake-user-id", "tournament-x")).rejects.toThrow(
      "Failed to find key fake-user-id in repository user",
    );
  });

  it("should increment points and reject unknown users", async () => {
    const user = await getUserByUsername("user3");

    await incrementUserPoints(user!.userId, 25);
    expect((await UserRepo.get(user!.userId)).points).toBe(25);

    await expect(incrementUserPoints("fake-user-id", 10)).rejects.toThrow(
      "Failed to find key fake-user-id in repository user",
    );
  });

  it("should initialize missing points before incrementing", async () => {
    const user = await getUserByUsername("user0");
    const record = await UserRepo.get(user!.userId);
    const sparseRecord = {
      ...record,
      points: undefined,
    } as unknown as UserRecord;

    await UserRepo.set(user!.userId, sparseRecord);
    await incrementUserPoints(user!.userId, 7);

    expect((await UserRepo.get(user!.userId)).points).toBe(7);
  });
});
