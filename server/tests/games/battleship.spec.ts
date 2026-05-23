/**
 * Unit coverage for Battleship rules, view masking, service wrappers, and AI targeting behavior.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BATTLESHIP_BOARD_SIZE,
  BATTLESHIP_SHIP_ORDER,
  type BattleshipCoordinate,
  type BattleshipPlacedShip,
  type BattleshipState,
} from "@gamenite/shared";
import {
  battleshipAiUser,
  battleshipGameService,
  battleshipLogic,
  chooseBattleshipAiMove,
  isBattleshipAiTurn,
} from "../../src/games/battleship.ts";

const ORIGINAL_SHIP_ORDER = [...BATTLESHIP_SHIP_ORDER];

const FLEET_A: BattleshipPlacedShip[] = [
  { ship: "carrier", row: 0, col: 0, orientation: "horizontal" },
  { ship: "battleship", row: 1, col: 0, orientation: "horizontal" },
  { ship: "destroyer", row: 2, col: 0, orientation: "horizontal" },
  { ship: "submarine", row: 3, col: 0, orientation: "horizontal" },
  { ship: "cruiser", row: 4, col: 0, orientation: "horizontal" },
];

const FLEET_B: BattleshipPlacedShip[] = [
  { ship: "carrier", row: 0, col: 0, orientation: "vertical" },
  { ship: "battleship", row: 0, col: 1, orientation: "vertical" },
  { ship: "destroyer", row: 0, col: 2, orientation: "vertical" },
  { ship: "submarine", row: 0, col: 3, orientation: "vertical" },
  { ship: "cruiser", row: 0, col: 4, orientation: "vertical" },
];

function readyState(): BattleshipState {
  const placedA = battleshipLogic.update(
    battleshipLogic.start(2),
    { type: "placeFleet", ships: FLEET_A },
    0,
  );
  if (!placedA) throw new Error("Failed to place player 1 fleet");
  const placedB = battleshipLogic.update(placedA, { type: "placeFleet", ships: FLEET_B }, 1);
  if (!placedB) throw new Error("Failed to place player 2 fleet");
  return placedB;
}

function readyAiState(shots: BattleshipCoordinate[] = [], aiPlayerIndex = 1): BattleshipState {
  const state = readyState();
  state.aiPlayerIndex = aiPlayerIndex;
  state.nextPlayer = aiPlayerIndex;
  state.shotsByPlayer[aiPlayerIndex] = shots;
  state.aiState = null;
  return state;
}

function replaceShipOrder(order: string[]): void {
  const mutable = BATTLESHIP_SHIP_ORDER as unknown as string[];
  mutable.splice(0, mutable.length, ...order);
}

function allBoardCoordinates(): BattleshipCoordinate[] {
  return Array.from({ length: BATTLESHIP_BOARD_SIZE }).flatMap((_, row) =>
    Array.from({ length: BATTLESHIP_BOARD_SIZE }).map((__, col) => ({ row, col })),
  );
}

function mockRandomSequence(values: number[]): void {
  let index = 0;
  vi.spyOn(Math, "random").mockImplementation(() => {
    const next = values[index];
    index += 1;
    if (next === undefined) {
      throw new Error(`Math.random exhausted at call ${index}`);
    }
    return next;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  replaceShipOrder([...ORIGINAL_SHIP_ORDER]);
});

describe("Battleship start() logic", () => {
  it("starts in placement phase with empty scores and no winner", () => {
    expect(battleshipLogic.start(2)).toStrictEqual({
      phase: "placement",
      players: [
        { ready: false, ships: [] },
        { ready: false, ships: [] },
      ],
      shotsByPlayer: [[], []],
      nextPlayer: 0,
      winner: null,
      scores: [0, 0],
      aiPlayerIndex: null,
      aiState: null,
    });
  });
});

describe("Battleship placement logic", () => {
  it("rejects duplicate ships", () => {
    const invalidFleet: BattleshipPlacedShip[] = [
      { ship: "carrier", row: 0, col: 0, orientation: "horizontal" },
      { ship: "carrier", row: 1, col: 0, orientation: "horizontal" },
      { ship: "destroyer", row: 2, col: 0, orientation: "horizontal" },
      { ship: "submarine", row: 3, col: 0, orientation: "horizontal" },
      { ship: "cruiser", row: 4, col: 0, orientation: "horizontal" },
    ];
    expect(
      battleshipLogic.update(
        battleshipLogic.start(2),
        { type: "placeFleet", ships: invalidFleet },
        0,
      ),
    ).toBeNull();
  });

  it("rejects overlapping ships", () => {
    const overlappingFleet: BattleshipPlacedShip[] = [
      { ship: "carrier", row: 0, col: 0, orientation: "horizontal" },
      { ship: "battleship", row: 0, col: 2, orientation: "vertical" },
      { ship: "destroyer", row: 5, col: 0, orientation: "horizontal" },
      { ship: "submarine", row: 6, col: 0, orientation: "horizontal" },
      { ship: "cruiser", row: 7, col: 0, orientation: "horizontal" },
    ];
    expect(
      battleshipLogic.update(
        battleshipLogic.start(2),
        { type: "placeFleet", ships: overlappingFleet },
        0,
      ),
    ).toBeNull();
  });

  it("rejects fleets that extend off the board", () => {
    const invalidFleet: BattleshipPlacedShip[] = [
      ...FLEET_A.slice(0, 4),
      { ship: "cruiser", row: 7, col: 7, orientation: "horizontal" },
    ];
    expect(
      battleshipLogic.update(
        battleshipLogic.start(2),
        { type: "placeFleet", ships: invalidFleet },
        0,
      ),
    ).toBeNull();
  });

  it("returns null if runtime ship ordering no longer matches the validated payload length", () => {
    replaceShipOrder([...ORIGINAL_SHIP_ORDER, "ghost"]);
    expect(
      battleshipLogic.update(battleshipLogic.start(2), { type: "placeFleet", ships: FLEET_A }, 0),
    ).toBeNull();
  });

  it("throws when runtime ship ordering references a ship that is missing from the normalized fleet", () => {
    replaceShipOrder(["carrier", "battleship", "destroyer", "submarine", "ghost"]);
    expect(() =>
      battleshipLogic.update(battleshipLogic.start(2), { type: "placeFleet", ships: FLEET_A }, 0),
    ).toThrow("Fleet normalization failed");
  });

  it("starts the battle after both fleets are locked", () => {
    const state = readyState();
    expect(state.phase).toBe("battle");
    expect(state.nextPlayer).toBe(0);
    expect(state.players.map((player) => player.ready)).toStrictEqual([true, true]);
  });

  it("does not allow a player to replace a locked fleet", () => {
    const placedA = battleshipLogic.update(
      battleshipLogic.start(2),
      { type: "placeFleet", ships: FLEET_A },
      0,
    );
    if (!placedA) throw new Error("Expected initial placement to succeed");
    expect(battleshipLogic.update(placedA, { type: "placeFleet", ships: FLEET_B }, 0)).toBeNull();
  });

  it("does not allow fleet placements once battle has started", () => {
    expect(
      battleshipLogic.update(readyState(), { type: "placeFleet", ships: FLEET_A }, 0),
    ).toBeNull();
  });
});

describe("Battleship fire logic", () => {
  it("keeps the turn on a hit and awards score", () => {
    const state = readyState();
    const nextState = battleshipLogic.update(state, { type: "fire", row: 0, col: 0 }, 0);
    expect(nextState).toMatchObject({
      nextPlayer: 0,
      scores: [5, 0],
    });
  });

  it("switches the turn on a miss", () => {
    const state = readyState();
    const nextState = battleshipLogic.update(state, { type: "fire", row: 7, col: 7 }, 0);
    expect(nextState).toMatchObject({
      nextPlayer: 1,
      scores: [0, 0],
    });
  });

  it("rejects malformed, premature, out-of-turn, and repeated fire moves", () => {
    expect(
      battleshipLogic.update(battleshipLogic.start(2), { type: "fire", row: 8, col: 0 }, 0),
    ).toBeNull();
    expect(
      battleshipLogic.update(battleshipLogic.start(2), { type: "fire", row: 0, col: 0 }, 0),
    ).toBeNull();

    const state = readyState();
    expect(battleshipLogic.update(state, { type: "fire", row: 0, col: 0 }, 1)).toBeNull();

    const hitState = battleshipLogic.update(state, { type: "fire", row: 0, col: 0 }, 0);
    if (!hitState) throw new Error("Expected the opening hit to succeed");
    expect(battleshipLogic.update(hitState, { type: "fire", row: 0, col: 0 }, 0)).toBeNull();
  });

  it("marks misses, hits, and sunk ships on player and masked opponent boards", () => {
    const state = readyState();
    state.shotsByPlayer[1] = [
      { row: 7, col: 7 },
      { row: 0, col: 0 },
      { row: 4, col: 0 },
      { row: 4, col: 1 },
    ];

    const playerView = battleshipLogic.viewAs(state, 0);
    expect(playerView.viewer).toBe("player");
    if (playerView.viewer !== "player") throw new Error("Expected player view");
    expect(playerView.yourBoard[7][7]).toStrictEqual({ kind: "miss" });
    expect(playerView.yourBoard[0][0]).toStrictEqual({ kind: "hit", ship: "carrier" });
    expect(playerView.yourBoard[4][0]).toStrictEqual({ kind: "sunk", ship: "cruiser" });

    const opponentView = battleshipLogic.viewAs(state, 1);
    expect(opponentView.viewer).toBe("player");
    if (opponentView.viewer !== "player") throw new Error("Expected player view");
    expect(opponentView.opponentBoard[7][7]).toStrictEqual({ kind: "miss" });
    expect(opponentView.opponentBoard[0][0]).toStrictEqual({ kind: "hit" });
    expect(opponentView.opponentBoard[4][0]).toStrictEqual({ kind: "sunk", ship: "cruiser" });
  });

  it("reveals ship identity only once a ship is sunk", () => {
    let state = readyState();
    for (let row = 0; row < 4; row++) {
      const nextState = battleshipLogic.update(state, { type: "fire", row, col: 0 }, 0);
      if (!nextState) throw new Error("Expected a valid hit");
      state = nextState;
    }

    const partialView = battleshipLogic.viewAs(state, 0);
    expect(partialView.viewer).toBe("player");
    if (partialView.viewer !== "player") throw new Error("Expected player view");
    expect(partialView.opponentBoard[0][0]).toStrictEqual({ kind: "hit" });

    const sunkState = battleshipLogic.update(state, { type: "fire", row: 4, col: 0 }, 0);
    if (!sunkState) throw new Error("Expected the carrier to sink");
    const sunkView = battleshipLogic.viewAs(sunkState, 0);
    expect(sunkView.viewer).toBe("player");
    if (sunkView.viewer !== "player") throw new Error("Expected player view");
    expect(sunkView.opponentBoard[0][0]).toStrictEqual({ kind: "sunk", ship: "carrier" });
  });

  it("masks fleets from spectators", () => {
    const state = readyState();
    const spectatorView = battleshipLogic.viewAs(state, -1);
    expect(spectatorView.viewer).toBe("spectator");
    if (spectatorView.viewer !== "spectator") throw new Error("Expected spectator view");
    for (const board of spectatorView.boards) {
      for (const row of board) {
        expect(row.every((cell) => cell.kind === "unknown")).toBe(true);
      }
    }
  });

  it("formats move log coordinates with row letters and column numbers", () => {
    const state = readyState();
    const nextState = battleshipLogic.update(state, { type: "fire", row: 2, col: 0 }, 0);
    if (!nextState) throw new Error("Expected a valid shot");

    expect(
      battleshipLogic.describeMove(state, nextState, { type: "fire", row: 2, col: 0 }, 0),
    ).toContain("fired at C1");
  });

  it("ends the game once the final remaining ship is sunk", () => {
    const state = readyState();
    state.players[1].ships = [{ ship: "cruiser", row: 0, col: 0, orientation: "horizontal" }];
    state.shotsByPlayer[0] = [];
    state.shotsByPlayer[1] = [];
    state.scores = [0, 0];

    const firstHit = battleshipLogic.update(state, { type: "fire", row: 0, col: 0 }, 0);
    if (!firstHit) throw new Error("Expected the opening cruiser hit to succeed");
    const winningState = battleshipLogic.update(firstHit, { type: "fire", row: 0, col: 1 }, 0);
    if (!winningState) throw new Error("Expected the finishing cruiser hit to succeed");

    expect(winningState).toMatchObject({
      phase: "done",
      winner: 0,
      nextPlayer: 0,
      scores: [6, 0],
    });
    expect(battleshipLogic.isDone(winningState)).toBe(true);
    expect(battleshipLogic.getWinner(winningState)).toBe(0);
    expect(() => battleshipLogic.getWinner(readyState())).toThrow(
      "Cannot get winner before battleship game is done",
    );
  });

  it("describes placement, misses, sunk ships, and game-winning shots", () => {
    const startState = battleshipLogic.start(2);
    const placedState = battleshipLogic.update(
      startState,
      { type: "placeFleet", ships: FLEET_A },
      0,
    );
    if (!placedState) throw new Error("Expected fleet placement to succeed");
    expect(
      battleshipLogic.describeMove(
        startState,
        placedState,
        { type: "placeFleet", ships: FLEET_A },
        0,
      ),
    ).toBe(" locked in their fleet");

    const missState = readyState();
    const missed = battleshipLogic.update(missState, { type: "fire", row: 7, col: 7 }, 0);
    if (!missed) throw new Error("Expected the miss to succeed");
    expect(
      battleshipLogic.describeMove(missState, missed, { type: "fire", row: 7, col: 7 }, 0),
    ).toBe(" fired at H8 and missed");

    const cruiserState = readyState();
    const cruiserHit = battleshipLogic.update(cruiserState, { type: "fire", row: 0, col: 4 }, 0);
    if (!cruiserHit) throw new Error("Expected the first cruiser hit to succeed");
    const cruiserSunk = battleshipLogic.update(cruiserHit, { type: "fire", row: 1, col: 4 }, 0);
    if (!cruiserSunk) throw new Error("Expected the second cruiser hit to succeed");
    expect(
      battleshipLogic.describeMove(cruiserHit, cruiserSunk, { type: "fire", row: 1, col: 4 }, 0),
    ).toBe(" fired at B5 and sunk the cruiser");

    const finalShipState = readyState();
    finalShipState.players[1].ships = [
      { ship: "cruiser", row: 0, col: 0, orientation: "horizontal" },
    ];
    finalShipState.shotsByPlayer[0] = [];
    finalShipState.shotsByPlayer[1] = [];
    finalShipState.scores = [0, 0];
    const winPrep = battleshipLogic.update(finalShipState, { type: "fire", row: 0, col: 0 }, 0);
    if (!winPrep) throw new Error("Expected the opening winning sequence hit to succeed");
    const wonGame = battleshipLogic.update(winPrep, { type: "fire", row: 0, col: 1 }, 0);
    if (!wonGame) throw new Error("Expected the winning sequence to finish");
    expect(
      battleshipLogic.describeMove(winPrep, wonGame, { type: "fire", row: 0, col: 1 }, 0),
    ).toBe(" fired at A2, sunk the cruiser, and won the game");
  });
});

describe("Battleship AI targeting", () => {
  it("returns null unless it is currently the AI player's turn", () => {
    const state = readyState();
    expect(isBattleshipAiTurn(state)).toBe(false);
    expect(chooseBattleshipAiMove(state)).toBeNull();

    const aiTurnState = readyAiState();
    expect(isBattleshipAiTurn(aiTurnState)).toBe(true);
  });

  it("uses hunt mode to choose an unshot square when there is no active hit cluster", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = readyAiState([{ row: 7, col: 7 }]);

    const aiMove = chooseBattleshipAiMove(state);
    expect(aiMove).toStrictEqual({ type: "fire", row: 0, col: 0 });
  });

  it("tries adjacent squares in right-left-up-down order after a single hit", () => {
    const state = readyAiState([{ row: 2, col: 1 }]);

    const aiMove = chooseBattleshipAiMove(state);
    expect(aiMove).toStrictEqual({ type: "fire", row: 2, col: 2 });
  });

  it("focuses on the most recent unresolved hit cluster", () => {
    const state = readyAiState([
      { row: 0, col: 0 },
      { row: 2, col: 0 },
    ]);

    const aiMove = chooseBattleshipAiMove(state);
    expect(aiMove).toStrictEqual({ type: "fire", row: 2, col: 1 });
  });

  it("follows the inferred orientation after two aligned hits", () => {
    const state = readyAiState([
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);

    const aiMove = chooseBattleshipAiMove(state);
    expect(aiMove).toStrictEqual({ type: "fire", row: 0, col: 3 });
  });

  it("switches to the opposite endpoint after missing on the first oriented probe", () => {
    const state = readyAiState([
      { row: 0, col: 3 },
      { row: 0, col: 4 },
      { row: 0, col: 5 },
    ]);

    const aiMove = chooseBattleshipAiMove(state);
    expect(aiMove).toStrictEqual({ type: "fire", row: 0, col: 2 });
  });

  it("extends horizontal hit runs backward when the latest hit moved left", () => {
    const state = readyAiState([
      { row: 0, col: 2 },
      { row: 0, col: 1 },
    ]);

    const aiMove = chooseBattleshipAiMove(state);
    expect(aiMove).toStrictEqual({ type: "fire", row: 0, col: 0 });
  });

  it("extends vertical hit runs in the same direction as the latest hit", () => {
    const state = readyAiState(
      [
        { row: 1, col: 0 },
        { row: 2, col: 0 },
      ],
      0,
    );

    const aiMove = chooseBattleshipAiMove(state);
    expect(aiMove).toStrictEqual({ type: "fire", row: 3, col: 0 });
  });

  it("switches to the opposite vertical endpoint when the latest extension moved upward", () => {
    const state = readyAiState(
      [
        { row: 2, col: 0 },
        { row: 1, col: 0 },
      ],
      0,
    );

    const aiMove = chooseBattleshipAiMove(state);
    expect(aiMove).toStrictEqual({ type: "fire", row: 0, col: 0 });
  });

  it("returns to hunt mode after sinking a ship and clearing the active cluster", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    let state = readyAiState();

    for (const col of [0, 1, 2, 3, 4]) {
      const nextState = battleshipLogic.update(state, { type: "fire", row: 0, col }, 1);
      if (!nextState) throw new Error("Expected the AI hit sequence to succeed");
      state = nextState;
    }

    expect(state.aiState).toStrictEqual({
      unresolvedHits: [],
      pendingTargets: [],
    });
    expect(chooseBattleshipAiMove(state)).toStrictEqual({ type: "fire", row: 0, col: 5 });
  });

  it("falls back to newest-hit neighbors for ambiguous touching-ship clusters", () => {
    const state = readyAiState([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: 1 },
    ]);

    const aiMove = chooseBattleshipAiMove(state);
    expect(aiMove).toStrictEqual({ type: "fire", row: 0, col: 2 });
  });

  it("returns null when the AI has no remaining legal shots", () => {
    const state = readyAiState(allBoardCoordinates());
    state.aiState = { unresolvedHits: [], pendingTargets: [] };

    expect(chooseBattleshipAiMove(state)).toBeNull();
  });

  it("continues rebuilding a hit cluster if the DFS stack pops an undefined value", () => {
    const originalPop = Array.prototype.pop;
    vi.spyOn(Array.prototype, "pop").mockImplementationOnce(function (this: unknown[]) {
      originalPop.call(this);
      return undefined;
    });

    const state = readyAiState([{ row: 2, col: 1 }]);
    expect(chooseBattleshipAiMove(state)).toStrictEqual({ type: "fire", row: 2, col: 2 });
  });
});

describe("Battleship view metadata", () => {
  it("reports every ship as unsunk before either player has placed a fleet", () => {
    const view = battleshipLogic.viewAs(battleshipLogic.start(2), 0);
    expect(view.fleetStatus[0].every((ship) => ship.sunk === false)).toBe(true);
    expect(view.fleetStatus[1].every((ship) => ship.sunk === false)).toBe(true);
  });

  it("keeps the standard fleet ordering in status output", () => {
    const view = battleshipLogic.viewAs(readyState(), 0);
    const fleetStatus = view.viewer === "player" ? view.fleetStatus[0] : view.fleetStatus[0];
    expect(fleetStatus.map((ship) => ship.ship)).toStrictEqual([...BATTLESHIP_SHIP_ORDER]);
  });
});

describe("Battleship game service", () => {
  it("creates human-only games without auto-readying an AI player", () => {
    const { state, views } = battleshipGameService.create(["user-a", "user-b"]);

    expect(state).toMatchObject({
      phase: "placement",
      aiPlayerIndex: null,
      aiState: null,
    });
    expect(views.watchers.type).toBe("battleship");
    expect(views.players.map((player) => player.userId)).toStrictEqual(["user-a", "user-b"]);
  });

  it("creates AI games with a generated fleet and tagged views", () => {
    mockRandomSequence([
      0.0, 0.99, 0.1, 0.0, 0.0, 0.9, 0.0, 0.2, 0.9, 0.0, 0.3, 0.9, 0.0, 0.4, 0.9, 0.0, 0.6, 0.9,
    ]);

    const ai = battleshipAiUser();
    const result = battleshipGameService.create(["user-a", ai.userId]);
    const state = result.state as BattleshipState;
    const views = result.views;

    expect(ai).toStrictEqual({
      userId: "__battleship_ai__",
      username: "__battleship_ai__",
    });
    expect(state.aiPlayerIndex).toBe(1);
    expect(state.players[1].ready).toBe(true);
    expect(state.players[1].ships).toHaveLength(BATTLESHIP_SHIP_ORDER.length);
    expect(state.aiState).toStrictEqual({
      unresolvedHits: [],
      pendingTargets: [],
    });
    expect(views.watchers.type).toBe("battleship");
    expect(views.players[1]).toMatchObject({
      userId: ai.userId,
      view: { type: "battleship" },
    });
  });

  it("throws if AI fleet generation normalizes to an invalid fleet", () => {
    replaceShipOrder(["carrier", "battleship", "destroyer", "submarine", "carrier"]);
    mockRandomSequence([0.0, 0.0, 0.9, 0.0, 0.2, 0.9, 0.0, 0.3, 0.9, 0.0, 0.4, 0.9, 0.0, 0.6, 0.9]);

    expect(() => battleshipGameService.create(["user-a", battleshipAiUser().userId])).toThrow(
      "AI fleet generation failed",
    );
  });

  it("wraps view, update, and winner helpers around the core logic", () => {
    const players = ["user-a", "user-b"];
    const state = readyState();

    expect(battleshipGameService.view(state, -1)).toMatchObject({ type: "battleship" });
    expect(
      battleshipGameService.update(state, { type: "fire", row: 0, col: 0 }, 1, players),
    ).toBeNull();

    const validUpdate = battleshipGameService.update(
      state,
      { type: "fire", row: 7, col: 7 },
      0,
      players,
    );
    expect(validUpdate).not.toBeNull();
    expect(validUpdate).toMatchObject({
      done: false,
      moveDescription: " fired at H8 and missed",
      views: {
        watchers: { type: "battleship" },
      },
    });

    const winningState = readyState();
    winningState.players[1].ships = [
      { ship: "cruiser", row: 0, col: 0, orientation: "horizontal" },
    ];
    winningState.shotsByPlayer[0] = [];
    winningState.shotsByPlayer[1] = [];
    winningState.scores = [0, 0];
    const winPrep = battleshipLogic.update(winningState, { type: "fire", row: 0, col: 0 }, 0);
    if (!winPrep) throw new Error("Expected the wrapped winner setup hit to succeed");
    const wonGame = battleshipLogic.update(winPrep, { type: "fire", row: 0, col: 1 }, 0);
    if (!wonGame) throw new Error("Expected the wrapped winner setup to finish");

    expect(battleshipGameService.getWinner(wonGame)).toBe(0);
  });
});
