/**
 * Core Battleship rules, view shaping, scoring, and AI move selection.
 */
import {
  BATTLESHIP_BOARD_SIZE,
  BATTLESHIP_SHIP_ORDER,
  battleshipScoreRules,
  battleshipShipSpecs,
  type BattleshipAiState,
  type BattleshipCoordinate,
  type BattleshipMove,
  type BattleshipOwnCell,
  type BattleshipOrientation,
  type BattleshipPlacedShip,
  type BattleshipPlayerState,
  type BattleshipShipKind,
  type BattleshipShipStatus,
  type BattleshipState,
  type BattleshipTargetCell,
  type BattleshipView,
  zBattleshipMove,
} from "@gamenite/shared";
import { type GameLogic } from "./gameLogic.ts";
import { type GameServicer } from "./gameServiceManager.ts";
import { type GameViewUpdates } from "../types.ts";
import { BATTLESHIP_AI_USER_ID, isBattleshipAiUserId } from "./battleshipAIUser.ts";

/**
 * Creates the empty per-player Battleship state used during setup.
 */
function emptyPlayerState(): BattleshipPlayerState {
  return {
    ready: false,
    ships: [],
  };
}

/**
 * Returns a shallow clone of a board coordinate.
 */
function cloneCoordinate({ row, col }: BattleshipCoordinate): BattleshipCoordinate {
  return { row, col };
}

/**
 * Serializes a coordinate into a stable key for sets and maps.
 */
function coordinateKey({ row, col }: BattleshipCoordinate): string {
  return `${row},${col}`;
}

/**
 * Returns whether two coordinates refer to the same board cell.
 */
function sameCoordinate(left: BattleshipCoordinate, right: BattleshipCoordinate): boolean {
  return left.row === right.row && left.col === right.col;
}

/**
 * Returns whether a coordinate falls within the Battleship board bounds.
 */
function isInBounds({ row, col }: BattleshipCoordinate): boolean {
  return row >= 0 && row < BATTLESHIP_BOARD_SIZE && col >= 0 && col < BATTLESHIP_BOARD_SIZE;
}

/**
 * Returns the configured length for a ship kind.
 */
function shipLength(ship: BattleshipShipKind): number {
  return battleshipShipSpecs[ship].length;
}

/**
 * Returns a lowercase human-readable label for a ship kind.
 */
function shipLabel(ship: BattleshipShipKind): string {
  return battleshipShipSpecs[ship].label.toLowerCase();
}

/**
 * Expands a placed ship into the list of occupied board cells.
 */
function shipCells(placement: BattleshipPlacedShip): BattleshipCoordinate[] {
  const length = shipLength(placement.ship);
  return Array.from({ length }).map((_, offset) => ({
    row: placement.row + (placement.orientation === "vertical" ? offset : 0),
    col: placement.col + (placement.orientation === "horizontal" ? offset : 0),
  }));
}

/**
 * Returns in-bounds orthogonal neighbors for a coordinate.
 */
function orthogonalNeighbors({ row, col }: BattleshipCoordinate): BattleshipCoordinate[] {
  return [
    { row: row - 1, col },
    { row, col: col + 1 },
    { row: row + 1, col },
    { row, col: col - 1 },
  ].filter(isInBounds);
}

/**
 * Returns AI-priority neighboring targets for a coordinate.
 */
function targetNeighbors({ row, col }: BattleshipCoordinate): BattleshipCoordinate[] {
  return [
    { row, col: col + 1 },
    { row, col: col - 1 },
    { row: row - 1, col },
    { row: row + 1, col },
  ].filter(isInBounds);
}

/**
 * Creates an empty own-board view with no ships or shots rendered.
 */
function emptyOwnBoard(): BattleshipOwnCell[][] {
  return Array.from({ length: BATTLESHIP_BOARD_SIZE }).map(() =>
    Array.from({ length: BATTLESHIP_BOARD_SIZE }).map(() => ({ kind: "empty" as const })),
  );
}

/**
 * Creates an empty masked target-board view.
 */
function emptyTargetBoard(): BattleshipTargetCell[][] {
  return Array.from({ length: BATTLESHIP_BOARD_SIZE }).map(() =>
    Array.from({ length: BATTLESHIP_BOARD_SIZE }).map(() => ({ kind: "unknown" as const })),
  );
}

/**
 * Validates and normalizes a fleet into the canonical ship order.
 */
function normalizeFleet(ships: BattleshipPlacedShip[]): BattleshipPlacedShip[] | null {
  if (ships.length !== BATTLESHIP_SHIP_ORDER.length) return null;

  const shipMap = new Map<BattleshipShipKind, BattleshipPlacedShip>();
  const occupied = new Set<string>();

  for (const placement of ships) {
    if (shipMap.has(placement.ship)) return null;

    const cells = shipCells(placement);
    if (!cells.every(isInBounds)) return null;

    for (const cell of cells) {
      const key = coordinateKey(cell);
      if (occupied.has(key)) return null;
      occupied.add(key);
    }

    shipMap.set(placement.ship, placement);
  }

  return BATTLESHIP_SHIP_ORDER.map((ship) => {
    const placement = shipMap.get(ship);
    if (!placement) throw new Error("Fleet normalization failed");
    return {
      ship,
      row: placement.row,
      col: placement.col,
      orientation: placement.orientation,
    };
  });
}

/**
 * Deep-copies Battleship state so updates can remain immutable.
 */
function copyState(state: BattleshipState): BattleshipState {
  return {
    phase: state.phase,
    players: state.players.map((player) => ({
      ready: player.ready,
      ships: player.ships.map((ship) => ({ ...ship })),
    })) as [BattleshipPlayerState, BattleshipPlayerState],
    shotsByPlayer: state.shotsByPlayer.map((shots) => shots.map(cloneCoordinate)) as [
      BattleshipCoordinate[],
      BattleshipCoordinate[],
    ],
    nextPlayer: state.nextPlayer,
    winner: state.winner,
    scores: [...state.scores] as [number, number],
    aiPlayerIndex: state.aiPlayerIndex,
    aiState: state.aiState
      ? {
          pendingTargets: state.aiState.pendingTargets.map(cloneCoordinate),
          unresolvedHits: state.aiState.unresolvedHits.map(cloneCoordinate),
        }
      : null,
  };
}

/**
 * Returns the set of coordinates already fired by one player.
 */
function getShotKeys(state: BattleshipState, attackerIndex: number): Set<string> {
  return new Set(state.shotsByPlayer[attackerIndex].map(coordinateKey));
}

/**
 * Returns the ship occupying a coordinate, if any.
 */
function getShipAt(
  playerState: BattleshipPlayerState,
  coordinate: BattleshipCoordinate,
): BattleshipPlacedShip | undefined {
  return playerState.ships.find((ship) =>
    shipCells(ship).some((cell) => sameCoordinate(cell, coordinate)),
  );
}

/**
 * Returns whether every cell of the supplied ship has been hit.
 */
function isShipSunk(
  state: BattleshipState,
  defenderIndex: number,
  ship: BattleshipPlacedShip,
): boolean {
  const shotKeys = getShotKeys(state, 1 - defenderIndex);
  return shipCells(ship).every((cell) => shotKeys.has(coordinateKey(cell)));
}

/**
 * Returns whether all ships for one defender have been sunk.
 */
function allShipsSunk(state: BattleshipState, defenderIndex: number): boolean {
  return (
    state.players[defenderIndex].ready &&
    state.players[defenderIndex].ships.every((ship) => isShipSunk(state, defenderIndex, ship))
  );
}

/**
 * Builds the ship-status summary shown in the Battleship UI.
 */
function buildFleetStatus(state: BattleshipState, playerIndex: number): BattleshipShipStatus[] {
  return BATTLESHIP_SHIP_ORDER.map((ship) => {
    const placement = state.players[playerIndex].ships.find((placed) => placed.ship === ship);
    return {
      ship,
      length: shipLength(ship),
      sunk: placement ? isShipSunk(state, playerIndex, placement) : false,
    };
  });
}

/**
 * Builds the full board view for a player, including their ships and incoming shots.
 */
function buildOwnBoard(state: BattleshipState, playerIndex: number): BattleshipOwnCell[][] {
  const board = emptyOwnBoard();
  const player = state.players[playerIndex];

  for (const ship of player.ships) {
    for (const cell of shipCells(ship)) {
      board[cell.row][cell.col] = { kind: "ship", ship: ship.ship };
    }
  }

  for (const shot of state.shotsByPlayer[1 - playerIndex]) {
    const ship = getShipAt(player, shot);
    if (!ship) {
      board[shot.row][shot.col] = { kind: "miss" };
      continue;
    }
    board[shot.row][shot.col] = {
      kind: isShipSunk(state, playerIndex, ship) ? "sunk" : "hit",
      ship: ship.ship,
    };
  }

  return board;
}

/**
 * Builds the masked opponent board shown to players and spectators.
 */
function buildMaskedBoard(state: BattleshipState, ownerIndex: number): BattleshipTargetCell[][] {
  const board = emptyTargetBoard();
  const owner = state.players[ownerIndex];

  for (const shot of state.shotsByPlayer[1 - ownerIndex]) {
    const ship = getShipAt(owner, shot);
    if (!ship) {
      board[shot.row][shot.col] = { kind: "miss" };
      continue;
    }
    if (isShipSunk(state, ownerIndex, ship)) {
      board[shot.row][shot.col] = { kind: "sunk", ship: ship.ship };
    } else {
      board[shot.row][shot.col] = { kind: "hit" };
    }
  }

  return board;
}

/**
 * Rebuilds the currently active AI target cluster from unresolved hits.
 */
function buildActiveHitCluster(state: BattleshipState, aiIndex: number): BattleshipCoordinate[] {
  const defenderIndex = 1 - aiIndex;
  const unresolvedHits = state.shotsByPlayer[aiIndex].filter((shot) => {
    const ship = getShipAt(state.players[defenderIndex], shot);
    return ship ? !isShipSunk(state, defenderIndex, ship) : false;
  });

  if (unresolvedHits.length === 0) return [];

  const seed = unresolvedHits[unresolvedHits.length - 1];
  const unresolvedKeys = new Set(unresolvedHits.map(coordinateKey));
  const clusterKeys = new Set<string>([coordinateKey(seed)]);
  const stack = [seed];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    for (const neighbor of orthogonalNeighbors(current)) {
      const key = coordinateKey(neighbor);
      if (!unresolvedKeys.has(key) || clusterKeys.has(key)) continue;
      clusterKeys.add(key);
      stack.push(neighbor);
    }
  }

  return unresolvedHits.filter((hit) => clusterKeys.has(coordinateKey(hit)));
}

/**
 * Infers a ship line only when the active hit cluster is cleanly horizontal or vertical.
 */
function inferTargetOrientation(cluster: BattleshipCoordinate[]): BattleshipOrientation | null {
  if (cluster.length < 2) return null;
  if (cluster.every((hit) => hit.row === cluster[0].row)) return "horizontal";
  if (cluster.every((hit) => hit.col === cluster[0].col)) return "vertical";
  return null;
}

/**
 * Builds extension targets that continue probing along an inferred ship line.
 */
function buildLineExtensionTargets(
  cluster: BattleshipCoordinate[],
  orientation: BattleshipOrientation,
  shotKeys: Set<string>,
): BattleshipCoordinate[] {
  const mostRecent = cluster[cluster.length - 1];
  const previous = cluster[cluster.length - 2];
  let candidates: BattleshipCoordinate[];

  if (orientation === "horizontal") {
    const cols = cluster.map((hit) => hit.col).sort((left, right) => left - right);
    const leftEnd = { row: cluster[0].row, col: cols[0] - 1 };
    const rightEnd = { row: cluster[0].row, col: cols[cols.length - 1] + 1 };
    const direction = mostRecent.col - previous.col;
    candidates = direction >= 0 ? [rightEnd, leftEnd] : [leftEnd, rightEnd];
  } else {
    const rows = cluster.map((hit) => hit.row).sort((top, bottom) => top - bottom);
    const topEnd = { row: rows[0] - 1, col: cluster[0].col };
    const bottomEnd = { row: rows[rows.length - 1] + 1, col: cluster[0].col };
    const direction = mostRecent.row - previous.row;
    candidates = direction >= 0 ? [bottomEnd, topEnd] : [topEnd, bottomEnd];
  }

  return candidates.filter((candidate) => {
    if (!isInBounds(candidate)) return false;
    return !shotKeys.has(coordinateKey(candidate));
  });
}

/**
 * Falls back to neighboring probes when no reliable line extension is available.
 */
function buildFallbackTargets(
  cluster: BattleshipCoordinate[],
  shotKeys: Set<string>,
): BattleshipCoordinate[] {
  const pendingTargets: BattleshipCoordinate[] = [];
  const pendingTargetKeys = new Set<string>();

  for (const hit of [...cluster].reverse()) {
    for (const neighbor of targetNeighbors(hit)) {
      const key = coordinateKey(neighbor);
      if (shotKeys.has(key) || pendingTargetKeys.has(key)) continue;
      pendingTargets.push(neighbor);
      pendingTargetKeys.add(key);
    }
  }

  return pendingTargets;
}

/**
 * Recomputes the AI's pending-target state from the current board.
 */
function rebuildAiState(state: BattleshipState): BattleshipAiState | null {
  if (state.aiPlayerIndex === null) return null;
  const aiIndex = state.aiPlayerIndex;
  const shotKeys = getShotKeys(state, aiIndex);
  const unresolvedHits = buildActiveHitCluster(state, aiIndex);
  const orientation = inferTargetOrientation(unresolvedHits);
  const lineTargets =
    orientation === null ? [] : buildLineExtensionTargets(unresolvedHits, orientation, shotKeys);
  const pendingTargets =
    lineTargets.length > 0 ? lineTargets : buildFallbackTargets(unresolvedHits, shotKeys);

  return { unresolvedHits, pendingTargets };
}

/**
 * Classifies the result of a fired shot for move logging.
 */
function describeShotResult(
  state: BattleshipState,
  attackerIndex: number,
  coordinate: BattleshipCoordinate,
): { result: "miss" | "hit" | "sunk"; ship?: BattleshipShipKind } {
  const defenderIndex = 1 - attackerIndex;
  const ship = getShipAt(state.players[defenderIndex], coordinate);
  if (!ship) return { result: "miss" };
  if (isShipSunk(state, defenderIndex, ship)) {
    return { result: "sunk", ship: ship.ship };
  }
  return { result: "hit" };
}

/**
 * Formats a coordinate as a Battleship label like A1 or C7.
 */
function coordinateLabel({ row, col }: BattleshipCoordinate): string {
  return `${String.fromCharCode("A".charCodeAt(0) + row)}${col + 1}`;
}

/**
 * Builds watcher and player view updates for a Battleship state snapshot.
 */
function makeViewUpdates(players: string[], state: BattleshipState): GameViewUpdates {
  return {
    watchers: battleshipLogic.tagView(battleshipLogic.viewAs(state, -1)),
    players: players.map((userId, index) => ({
      userId,
      view: battleshipLogic.tagView(battleshipLogic.viewAs(state, index)),
    })),
  };
}

/**
 * Returns whether a candidate ship can be added to a partially built fleet.
 */
function canPlacePartialFleet(
  existing: BattleshipPlacedShip[],
  candidate: BattleshipPlacedShip,
): boolean {
  const occupied = new Set<string>();
  for (const placement of existing) {
    for (const cell of shipCells(placement)) {
      occupied.add(coordinateKey(cell));
    }
  }
  const candidateCells = shipCells(candidate);
  if (!candidateCells.every(isInBounds)) return false;
  return candidateCells.every((cell) => !occupied.has(coordinateKey(cell)));
}

/**
 * Generates a valid random fleet for the Battleship AI.
 */
function makeRandomFleet(): BattleshipPlacedShip[] {
  const fleet: BattleshipPlacedShip[] = [];

  for (const ship of BATTLESHIP_SHIP_ORDER) {
    let placed = false;
    while (!placed) {
      const candidate: BattleshipPlacedShip = {
        ship,
        row: Math.floor(Math.random() * BATTLESHIP_BOARD_SIZE),
        col: Math.floor(Math.random() * BATTLESHIP_BOARD_SIZE),
        orientation: Math.random() < 0.5 ? "horizontal" : "vertical",
      };
      if (!canPlacePartialFleet(fleet, candidate)) continue;
      fleet.push(candidate);
      placed = true;
    }
  }

  const normalized = normalizeFleet(fleet);
  if (!normalized) throw new Error("AI fleet generation failed");
  return normalized;
}

/**
 * Creates the initial Battleship game state before any fleets are locked in.
 */
function createInitialState(): BattleshipState {
  return {
    phase: "placement",
    players: [emptyPlayerState(), emptyPlayerState()],
    shotsByPlayer: [[], []],
    nextPlayer: 0,
    winner: null,
    scores: [0, 0],
    aiPlayerIndex: null,
    aiState: null,
  };
}

/**
 * Returns whether the current turn belongs to the Battleship AI player.
 */
export function isBattleshipAiTurn(state: BattleshipState): boolean {
  return (
    state.phase === "battle" &&
    state.aiPlayerIndex !== null &&
    state.nextPlayer === state.aiPlayerIndex
  );
}

/**
 * Chooses the Battleship AI's next move using a hunt-and-target strategy.
 */
export function chooseBattleshipAiMove(state: BattleshipState): BattleshipMove | null {
  if (!isBattleshipAiTurn(state) || state.aiPlayerIndex === null) return null;
  const aiIndex = state.aiPlayerIndex;
  const aiState = state.aiState ?? rebuildAiState(state);
  if (aiState && aiState.pendingTargets.length > 0) {
    const target = aiState.pendingTargets[0];
    return { type: "fire", row: target.row, col: target.col };
  }

  const shotKeys = getShotKeys(state, aiIndex);
  const available = Array.from({ length: BATTLESHIP_BOARD_SIZE }).flatMap((_, row) =>
    Array.from({ length: BATTLESHIP_BOARD_SIZE }).map((__, col) => ({ row, col })),
  );
  const remaining = available.filter((cell) => !shotKeys.has(coordinateKey(cell)));
  if (remaining.length === 0) return null;
  const choice = remaining[Math.floor(Math.random() * remaining.length)];
  return { type: "fire", row: choice.row, col: choice.col };
}

export const battleshipLogic: GameLogic<BattleshipState, BattleshipView> = {
  minPlayers: 2,
  maxPlayers: 2,
  start: () => createInitialState(),
  update: (state, payload, playerIndex) => {
    const move = zBattleshipMove.safeParse(payload);
    if (!move.success) return null;

    if (move.data.type === "placeFleet") {
      if (state.phase !== "placement") return null;
      if (state.players[playerIndex].ready) return null;
      const normalizedFleet = normalizeFleet(move.data.ships);
      if (!normalizedFleet) return null;

      const nextState = copyState(state);
      nextState.players[playerIndex] = { ready: true, ships: normalizedFleet };
      if (nextState.players.every((player) => player.ready)) {
        nextState.phase = "battle";
        nextState.nextPlayer = 0;
      }
      nextState.aiState = rebuildAiState(nextState);
      return nextState;
    }

    if (state.phase !== "battle") return null;
    if (playerIndex !== state.nextPlayer) return null;

    const coordinate = { row: move.data.row, col: move.data.col };
    const shotKeys = getShotKeys(state, playerIndex);
    if (shotKeys.has(coordinateKey(coordinate))) return null;

    const defenderIndex = 1 - playerIndex;
    const nextState = copyState(state);
    nextState.shotsByPlayer[playerIndex] = [...nextState.shotsByPlayer[playerIndex], coordinate];

    const ship = getShipAt(nextState.players[defenderIndex], coordinate);
    if (!ship) {
      nextState.nextPlayer = defenderIndex;
      nextState.aiState = rebuildAiState(nextState);
      return nextState;
    }

    const scoreRule = battleshipScoreRules[ship.ship];
    nextState.scores[playerIndex] += scoreRule.hit;

    if (isShipSunk(nextState, defenderIndex, ship)) {
      nextState.scores[playerIndex] += scoreRule.sinkBonus;
    }

    if (allShipsSunk(nextState, defenderIndex)) {
      nextState.phase = "done";
      nextState.winner = playerIndex;
      nextState.nextPlayer = playerIndex;
    } else {
      nextState.nextPlayer = playerIndex;
    }

    nextState.aiState = rebuildAiState(nextState);
    return nextState;
  },
  isDone: (state) => state.phase === "done",
  getWinner: (state) => {
    if (state.winner === null) {
      throw new Error("Cannot get winner before battleship game is done");
    }
    return state.winner;
  },
  viewAs: (state, playerIndex) => {
    const base = {
      phase: state.phase,
      boardSize: BATTLESHIP_BOARD_SIZE,
      ready: [state.players[0].ready, state.players[1].ready] as [boolean, boolean],
      nextPlayer: state.nextPlayer,
      winner: state.winner,
      scores: [...state.scores] as [number, number],
      fleetStatus: [buildFleetStatus(state, 0), buildFleetStatus(state, 1)] as [
        BattleshipShipStatus[],
        BattleshipShipStatus[],
      ],
    };

    if (playerIndex < 0) {
      return {
        ...base,
        viewer: "spectator",
        boards: [buildMaskedBoard(state, 0), buildMaskedBoard(state, 1)],
      };
    }

    return {
      ...base,
      viewer: "player",
      playerIndex,
      yourLockedFleet: state.players[playerIndex].ships.map((ship) => ({ ...ship })),
      yourBoard: buildOwnBoard(state, playerIndex),
      opponentBoard: buildMaskedBoard(state, 1 - playerIndex),
    };
  },
  tagView: (view) => ({ type: "battleship", view }),
  describeMove: (_prevState, newState, payload, playerIndex) => {
    const move = zBattleshipMove.parse(payload);
    if (move.type === "placeFleet") {
      return " locked in their fleet";
    }

    const coordinate = { row: move.row, col: move.col };
    const target = coordinateLabel(coordinate);
    const result = describeShotResult(newState, playerIndex, coordinate);
    if (result.result === "miss") {
      return ` fired at ${target} and missed`;
    }
    if (result.result === "hit") {
      return ` fired at ${target} and scored a hit`;
    }
    if (newState.phase === "done") {
      return ` fired at ${target}, sunk the ${shipLabel(result.ship!)}, and won the game`;
    }
    return ` fired at ${target} and sunk the ${shipLabel(result.ship!)}`;
  },
};

export const battleshipGameService: GameServicer = {
  minPlayers: 2,
  maxPlayers: 2,
  create(players) {
    const state = battleshipLogic.start(players.length);
    const aiPlayerIndex = players.findIndex(isBattleshipAiUserId);
    if (aiPlayerIndex >= 0) {
      state.aiPlayerIndex = aiPlayerIndex;
      state.players[aiPlayerIndex] = {
        ready: true,
        ships: makeRandomFleet(),
      };
      state.aiState = rebuildAiState(state);
    }
    return { state, views: makeViewUpdates(players, state) };
  },
  view(state, playerIndex) {
    return battleshipLogic.tagView(battleshipLogic.viewAs(state as BattleshipState, playerIndex));
  },
  update(state, movePayload, playerIndex, players) {
    const newState = battleshipLogic.update(state as BattleshipState, movePayload, playerIndex);
    if (!newState) return null;
    return {
      state: newState,
      views: makeViewUpdates(players, newState),
      done: battleshipLogic.isDone(newState),
      moveDescription: battleshipLogic.describeMove(
        state as BattleshipState,
        newState,
        movePayload,
        playerIndex,
      ),
    };
  },
  getWinner(state) {
    return battleshipLogic.getWinner(state as BattleshipState);
  },
};

/**
 * Returns the synthetic user identity used for server-side Battleship AI turns.
 */
export function battleshipAiUser(): { userId: string; username: string } {
  return { userId: BATTLESHIP_AI_USER_ID, username: BATTLESHIP_AI_USER_ID };
}
