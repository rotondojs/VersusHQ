import { describe, expect, it } from "vitest";
import {
  isPowerOfTwo,
  zCreateTournamentRequest,
  zEditTournamentRequest,
  zTournamentMaxPlayers,
  zTournamentRequestedGameMode,
  zTournamentResolvedGameMode,
} from "./games/tournaments/tournament.types.ts";

describe("isPowerOfTwo", () => {
  it("accepts valid tournament sizes", () => {
    expect(isPowerOfTwo(2)).toBe(true);
    expect(isPowerOfTwo(4)).toBe(true);
    expect(isPowerOfTwo(8)).toBe(true);
  });

  it("rejects invalid tournament sizes", () => {
    expect(isPowerOfTwo(1)).toBe(false);
    expect(isPowerOfTwo(3)).toBe(false);
    expect(isPowerOfTwo(6)).toBe(false);
  });
});

describe("zTournamentMaxPlayers", () => {
  it("accepts power-of-two sizes", () => {
    expect(zTournamentMaxPlayers.safeParse(2)).toStrictEqual({ success: true, data: 2 });
    expect(zTournamentMaxPlayers.safeParse(16)).toStrictEqual({ success: true, data: 16 });
  });

  it("rejects invalid sizes", () => {
    expect(zTournamentMaxPlayers.safeParse(0)).toMatchObject({ success: false });
    expect(zTournamentMaxPlayers.safeParse(3)).toMatchObject({ success: false });
    expect(zTournamentMaxPlayers.safeParse("4")).toMatchObject({ success: false });
  });
});

describe("tournament game mode schemas", () => {
  it("accepts requested modes including random", () => {
    expect(zTournamentRequestedGameMode.safeParse("nim")).toStrictEqual({
      success: true,
      data: "nim",
    });
    expect(zTournamentRequestedGameMode.safeParse("battleship")).toStrictEqual({
      success: true,
      data: "battleship",
    });
    expect(zTournamentRequestedGameMode.safeParse("random")).toStrictEqual({
      success: true,
      data: "random",
    });
  });

  it("accepts only concrete resolved modes", () => {
    expect(zTournamentResolvedGameMode.safeParse("guess")).toStrictEqual({
      success: true,
      data: "guess",
    });
    expect(zTournamentResolvedGameMode.safeParse("random")).toMatchObject({ success: false });
  });
});

describe("tournament request schemas", () => {
  it("accepts valid create requests", () => {
    expect(
      zCreateTournamentRequest.safeParse({
        title: "Spring Championship",
        description: "Single elimination bracket.",
        startTime: "2026-05-11T18:00:00.000Z",
        requestedGameMode: "random",
        maxPlayers: 8,
      }),
    ).toMatchObject({ success: true });
  });

  it("rejects invalid create requests", () => {
    expect(
      zCreateTournamentRequest.safeParse({
        title: "",
        description: "Bracket",
        startTime: "2026-05-11T18:00:00.000Z",
        requestedGameMode: "nim",
        maxPlayers: 8,
      }),
    ).toMatchObject({ success: false });

    expect(
      zCreateTournamentRequest.safeParse({
        title: "Bracket",
        description: "Tournament",
        startTime: "2026-05-11T18:00:00.000Z",
        requestedGameMode: "nim",
        maxPlayers: 10,
      }),
    ).toMatchObject({ success: false });
  });

  it("requires edits to include at least one field", () => {
    expect(zEditTournamentRequest.safeParse({})).toMatchObject({ success: false });
    expect(
      zEditTournamentRequest.safeParse({
        description: "Updated details",
      }),
    ).toMatchObject({ success: true });
  });
});
