/**
 * Shared schema tests for game creation requests and per-game move validation.
 */
import { expect, describe, it } from "vitest";
import { zBattleshipMove, zCreateGameRequest, zGuessMove, zNimMove } from "./game.types.ts";

describe("zNimMove", () => {
  it("accepts valid inputs", () => {
    expect(zNimMove.safeParse(1)).toStrictEqual({ success: true, data: 1 });
    expect(zNimMove.safeParse(2)).toStrictEqual({ success: true, data: 2 });
    expect(zNimMove.safeParse(3)).toStrictEqual({ success: true, data: 3 });
  });

  it("rejects invalid inputs", () => {
    expect(zNimMove.safeParse(0)).toMatchObject({ success: false });
    expect(zNimMove.safeParse(4)).toMatchObject({ success: false });
    expect(zNimMove.safeParse(null)).toMatchObject({ success: false });
  });
});

describe("zGuessMove", () => {
  it("accepts valid inputs", () => {
    expect(zGuessMove.safeParse(1)).toStrictEqual({ success: true, data: 1 });
    expect(zGuessMove.safeParse(2)).toStrictEqual({ success: true, data: 2 });
    expect(zGuessMove.safeParse(17)).toStrictEqual({ success: true, data: 17 });
    expect(zGuessMove.safeParse(100)).toStrictEqual({ success: true, data: 100 });
  });

  it("rejects invalid inputs", () => {
    expect(zGuessMove.safeParse(0)).toMatchObject({ success: false });
    expect(zGuessMove.safeParse(101)).toMatchObject({ success: false });
    expect(zGuessMove.safeParse(-4)).toMatchObject({ success: false });
    expect(zGuessMove.safeParse(undefined)).toMatchObject({ success: false });
    expect(zGuessMove.safeParse("55")).toMatchObject({ success: false });
  });
});

describe("zCreateGameRequest", () => {
  it("accepts nim and guess requests", () => {
    expect(zCreateGameRequest.safeParse({ type: "nim" })).toStrictEqual({
      success: true,
      data: { type: "nim" },
    });
    expect(zCreateGameRequest.safeParse({ type: "guess" })).toStrictEqual({
      success: true,
      data: { type: "guess" },
    });
  });

  it("accepts battleship requests only when an opponent type is provided", () => {
    expect(
      zCreateGameRequest.safeParse({ type: "battleship", opponentType: "human" }),
    ).toStrictEqual({
      success: true,
      data: { type: "battleship", opponentType: "human" },
    });
    expect(zCreateGameRequest.safeParse({ type: "battleship" })).toMatchObject({
      success: false,
    });
  });
});

describe("zBattleshipMove", () => {
  it("accepts valid placement and fire moves", () => {
    expect(
      zBattleshipMove.safeParse({
        type: "placeFleet",
        ships: [
          { ship: "carrier", row: 0, col: 0, orientation: "horizontal" },
          { ship: "battleship", row: 1, col: 0, orientation: "horizontal" },
          { ship: "destroyer", row: 2, col: 0, orientation: "horizontal" },
          { ship: "submarine", row: 3, col: 0, orientation: "horizontal" },
          { ship: "cruiser", row: 4, col: 0, orientation: "horizontal" },
        ],
      }),
    ).toMatchObject({ success: true });
    expect(zBattleshipMove.safeParse({ type: "fire", row: 7, col: 7 })).toStrictEqual({
      success: true,
      data: { type: "fire", row: 7, col: 7 },
    });
  });

  it("rejects out-of-bounds battleship moves", () => {
    expect(zBattleshipMove.safeParse({ type: "fire", row: 8, col: 0 })).toMatchObject({
      success: false,
    });
    expect(
      zBattleshipMove.safeParse({
        type: "placeFleet",
        ships: [
          { ship: "carrier", row: 0, col: 0, orientation: "horizontal" },
          { ship: "battleship", row: 1, col: 0, orientation: "horizontal" },
          { ship: "destroyer", row: 2, col: 0, orientation: "horizontal" },
          { ship: "submarine", row: 3, col: 0, orientation: "horizontal" },
          { ship: "cruiser", row: 9, col: 0, orientation: "horizontal" },
        ],
      }),
    ).toMatchObject({ success: false });
  });
});
