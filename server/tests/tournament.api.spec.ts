import { describe, expect, it } from "vitest";
import supertest, { type Response } from "supertest";
import { app } from "../src/app.ts";
import { randomUUID } from "node:crypto";

let response: Response;

const auth0 = { username: "user0", password: "pwd0000" };
const auth1 = { username: "user1", password: "pwd1111" };
const auth2 = { username: "user2", password: "pwd2222" };
const auth3 = { username: "user3", password: "pwd3333" };
const badAuth = { username: "user3", password: "incorrect" };

describe("POST /api/tournament/create", () => {
  it("returns 400 on malformed payloads", async () => {
    response = await supertest(app).post("/api/tournament/create").send({
      auth: auth3,
      payload: 4,
    });
    expect(response.status).toBe(400);

    response = await supertest(app)
      .post("/api/tournament/create")
      .send({
        auth: auth3,
        payload: {
          title: "Broken",
          description: "Invalid max players",
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          requestedGameMode: "nim",
          maxPlayers: 3,
        },
      });
    expect(response.status).toBe(400);
  });

  it("returns 403 on invalid auth", async () => {
    response = await supertest(app)
      .post("/api/tournament/create")
      .send({
        auth: badAuth,
        payload: {
          title: "Championship",
          description: "Tournament",
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          requestedGameMode: "nim",
          maxPlayers: 4,
        },
      });
    expect(response.status).toBe(403);
  });

  it("creates a tournament for the authenticated host", async () => {
    response = await supertest(app)
      .post("/api/tournament/create")
      .send({
        auth: auth3,
        payload: {
          title: "Spring Championship",
          description: "Single-elimination test tournament.",
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          requestedGameMode: "random",
          maxPlayers: 8,
        },
      });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      tournamentId: expect.any(String),
      title: "Spring Championship",
      description: "Single-elimination test tournament.",
      chat: expect.any(String),
      status: "upcoming",
      requestedGameMode: "random",
      maxPlayers: 8,
      participants: [{ username: "user3" }],
      hostUser: { username: "user3", display: "Frau Drei" },
      bracket: null,
    });
  });
});

describe("GET /api/tournament/:id", () => {
  it("returns 404 for an invalid tournament id", async () => {
    response = await supertest(app).get(`/api/tournament/${randomUUID().toString()}`);
    expect(response.status).toBe(404);
  });

  it("returns a seeded tournament", async () => {
    response = await supertest(app).get("/api/tournament/tournament-upcoming-0001");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      tournamentId: "tournament-upcoming-0001",
      chat: expect.any(String),
      title: "Spring Nim Open",
      status: "upcoming",
      requestedGameMode: "nim",
      participants: [{ username: "user0" }, { username: "user1" }],
    });
  });
});

describe("GET /api/tournament/list", () => {
  it("returns seeded tournaments sorted by start time", async () => {
    response = await supertest(app).get("/api/tournament/list");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      { tournamentId: "tournament-completed-0001", status: "completed" },
      { tournamentId: "tournament-completed-0002", status: "completed" },
      { tournamentId: "tournament-ongoing-0001", status: "ongoing" },
      { tournamentId: "tournament-upcoming-0001", status: "upcoming" },
    ]);
  });
});

describe("POST /api/tournament/:id/edit", () => {
  it("allows the host to update a tournament before it starts", async () => {
    response = await supertest(app)
      .post("/api/tournament/tournament-upcoming-0001/edit")
      .send({
        auth: auth0,
        payload: {
          title: "Updated Nim Open",
          maxPlayers: 8,
        },
      });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      tournamentId: "tournament-upcoming-0001",
      title: "Updated Nim Open",
      maxPlayers: 8,
    });
  });

  it("updates description, start time, and requested game mode", async () => {
    const updatedStartTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    response = await supertest(app)
      .post("/api/tournament/tournament-upcoming-0001/edit")
      .send({
        auth: auth0,
        payload: {
          description: "Revised tournament description.",
          startTime: updatedStartTime,
          requestedGameMode: "guess",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      tournamentId: "tournament-upcoming-0001",
      description: "Revised tournament description.",
      requestedGameMode: "guess",
    });
  });

  it("rejects non-host edits", async () => {
    response = await supertest(app)
      .post("/api/tournament/tournament-upcoming-0001/edit")
      .send({
        auth: auth2,
        payload: {
          title: "Illegal Edit",
        },
      });
    expect(response.status).toBe(403);
  });
});

describe("POST /api/tournament/:id/join and /leave", () => {
  it("returns 404 when joining a missing tournament", async () => {
    response = await supertest(app).post(`/api/tournament/${randomUUID().toString()}/join`).send({
      auth: auth2,
      payload: null,
    });

    expect(response.status).toBe(404);
  });

  it("allows a user to join and then leave an upcoming tournament", async () => {
    response = await supertest(app).get("/api/tournament/tournament-upcoming-0001");
    expect(response.status).toBe(200);
    const chatId = response.body.chat;

    response = await supertest(app).post("/api/tournament/tournament-upcoming-0001/join").send({
      auth: auth2,
      payload: null,
    });
    expect(response.status).toBe(200);
    expect(response.body.chat).toBe(chatId);
    expect(response.body.participants).toMatchObject([
      { username: "user0" },
      { username: "user1" },
      { username: "user2" },
    ]);

    response = await supertest(app).post("/api/tournament/tournament-upcoming-0001/leave").send({
      auth: auth2,
      payload: null,
    });
    expect(response.status).toBe(200);
    expect(response.body.chat).toBe(chatId);
    expect(response.body.participants).toMatchObject([
      { username: "user0" },
      { username: "user1" },
    ]);
  });

  it("does not allow the host to leave their own tournament", async () => {
    response = await supertest(app).post("/api/tournament/tournament-upcoming-0001/leave").send({
      auth: auth0,
      payload: null,
    });
    expect(response.status).toBe(400);
  });

  it("returns 404 when leaving a missing tournament", async () => {
    response = await supertest(app).post(`/api/tournament/${randomUUID().toString()}/leave`).send({
      auth: auth2,
      payload: null,
    });

    expect(response.status).toBe(404);
  });

  it("rejects users who try to leave a tournament they never joined", async () => {
    response = await supertest(app).post("/api/tournament/tournament-upcoming-0001/leave").send({
      auth: auth2,
      payload: null,
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: "User is not part of this tournament",
    });
  });
});

describe("POST /api/tournament/:id/cancel", () => {
  it("returns 404 for a missing tournament", async () => {
    response = await supertest(app).post(`/api/tournament/${randomUUID().toString()}/cancel`).send({
      auth: auth0,
      payload: null,
    });

    expect(response.status).toBe(404);
  });

  it("allows the host to cancel an upcoming tournament", async () => {
    response = await supertest(app).post("/api/tournament/tournament-upcoming-0001/cancel").send({
      auth: auth0,
      payload: null,
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      tournamentId: "tournament-upcoming-0001",
      status: "cancelled",
    });
  });
});

describe("POST /api/tournament/:id/start", () => {
  it("returns 404 for a missing tournament", async () => {
    response = await supertest(app).post(`/api/tournament/${randomUUID().toString()}/start`).send({
      auth: auth3,
      payload: null,
    });

    expect(response.status).toBe(404);
  });

  it("allows the host to start a full tournament early", async () => {
    response = await supertest(app)
      .post("/api/tournament/create")
      .send({
        auth: auth3,
        payload: {
          title: "Quick Cup",
          description: "Two-player warmup tournament.",
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          requestedGameMode: "random",
          maxPlayers: 2,
        },
      });
    expect(response.status).toBe(200);
    const tournamentId = response.body.tournamentId;
    const createdChatId = response.body.chat;

    response = await supertest(app).post(`/api/tournament/${tournamentId}/join`).send({
      auth: auth1,
      payload: null,
    });
    expect(response.status).toBe(200);

    response = await supertest(app).post(`/api/tournament/${tournamentId}/start`).send({
      auth: auth3,
      payload: null,
    });
    expect(response.status).toBe(200);
    expect(response.body.chat).toBe(createdChatId);
    expect(response.body).toMatchObject({
      tournamentId,
      status: "ongoing",
      resolvedGameMode: expect.stringMatching(/nim|guess|battleship/),
    });
    expect(response.body.bracket.root.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ username: "user3" }),
        expect.objectContaining({ username: "user1" }),
      ]),
    );
  });
});
