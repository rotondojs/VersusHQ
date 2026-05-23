/**
 * Shared Battleship constants, view models, and validated move schemas.
 */
import { z } from "zod";

export const BATTLESHIP_BOARD_SIZE = 8;

export const BATTLESHIP_SHIP_ORDER = [
  "carrier",
  "battleship",
  "destroyer",
  "submarine",
  "cruiser",
] as const;

export type BattleshipShipKind = (typeof BATTLESHIP_SHIP_ORDER)[number];
export const zBattleshipShipKind = z.enum(BATTLESHIP_SHIP_ORDER);

export const battleshipShipSpecs: {
  [key in BattleshipShipKind]: { label: string; length: number };
} = {
  carrier: { label: "Aircraft Carrier", length: 5 },
  battleship: { label: "Battleship", length: 4 },
  destroyer: { label: "Destroyer", length: 3 },
  submarine: { label: "Submarine", length: 3 },
  cruiser: { label: "Cruiser", length: 2 },
};

export const battleshipScoreRules: {
  [key in BattleshipShipKind]: { hit: number; sinkBonus: number };
} = {
  carrier: { hit: 5, sinkBonus: 5 },
  battleship: { hit: 4, sinkBonus: 4 },
  destroyer: { hit: 3, sinkBonus: 3 },
  submarine: { hit: 3, sinkBonus: 3 },
  cruiser: { hit: 2, sinkBonus: 2 },
};

export type BattleshipOpponentType = z.infer<typeof zBattleshipOpponentType>;
export const zBattleshipOpponentType = z.union([z.literal("human"), z.literal("ai")]);

export type BattleshipOrientation = z.infer<typeof zBattleshipOrientation>;
export const zBattleshipOrientation = z.union([z.literal("horizontal"), z.literal("vertical")]);

export interface BattleshipCoordinate {
  row: number;
  col: number;
}

export const zBattleshipCoordinate = z.object({
  row: z.int().gte(0).lt(BATTLESHIP_BOARD_SIZE),
  col: z.int().gte(0).lt(BATTLESHIP_BOARD_SIZE),
});

export interface BattleshipPlacedShip extends BattleshipCoordinate {
  ship: BattleshipShipKind;
  orientation: BattleshipOrientation;
}

export const zBattleshipPlacedShip = z.object({
  ship: zBattleshipShipKind,
  row: z.int().gte(0).lt(BATTLESHIP_BOARD_SIZE),
  col: z.int().gte(0).lt(BATTLESHIP_BOARD_SIZE),
  orientation: zBattleshipOrientation,
});

export interface BattleshipShipStatus {
  ship: BattleshipShipKind;
  length: number;
  sunk: boolean;
}

export interface BattleshipOwnCell {
  kind: "empty" | "ship" | "miss" | "hit" | "sunk";
  ship?: BattleshipShipKind;
}

export interface BattleshipTargetCell {
  kind: "unknown" | "miss" | "hit" | "sunk";
  ship?: BattleshipShipKind;
}

export interface BattleshipPlayerState {
  ready: boolean;
  ships: BattleshipPlacedShip[];
}

export interface BattleshipAiState {
  pendingTargets: BattleshipCoordinate[];
  unresolvedHits: BattleshipCoordinate[];
}

export interface BattleshipState {
  phase: "placement" | "battle" | "done";
  players: [BattleshipPlayerState, BattleshipPlayerState];
  shotsByPlayer: [BattleshipCoordinate[], BattleshipCoordinate[]];
  nextPlayer: number;
  winner: number | null;
  scores: [number, number];
  aiPlayerIndex: number | null;
  aiState: BattleshipAiState | null;
}

interface BattleshipBaseView {
  phase: "placement" | "battle" | "done";
  boardSize: number;
  ready: [boolean, boolean];
  nextPlayer: number;
  winner: number | null;
  scores: [number, number];
  fleetStatus: [BattleshipShipStatus[], BattleshipShipStatus[]];
}

export interface BattleshipPlayerView extends BattleshipBaseView {
  viewer: "player";
  playerIndex: number;
  yourLockedFleet: BattleshipPlacedShip[];
  yourBoard: BattleshipOwnCell[][];
  opponentBoard: BattleshipTargetCell[][];
}

export interface BattleshipSpectatorView extends BattleshipBaseView {
  viewer: "spectator";
  boards: [BattleshipTargetCell[][], BattleshipTargetCell[][]];
}

export type BattleshipView = BattleshipPlayerView | BattleshipSpectatorView;

export type BattleshipPlaceFleetMove = z.infer<typeof zBattleshipPlaceFleetMove>;
export const zBattleshipPlaceFleetMove = z.object({
  type: z.literal("placeFleet"),
  ships: z.array(zBattleshipPlacedShip).length(BATTLESHIP_SHIP_ORDER.length),
});

export type BattleshipFireMove = z.infer<typeof zBattleshipFireMove>;
export const zBattleshipFireMove = z.object({
  type: z.literal("fire"),
  row: z.int().gte(0).lt(BATTLESHIP_BOARD_SIZE),
  col: z.int().gte(0).lt(BATTLESHIP_BOARD_SIZE),
});

export type BattleshipMove = z.infer<typeof zBattleshipMove>;
export const zBattleshipMove = z.discriminatedUnion("type", [
  zBattleshipPlaceFleetMove,
  zBattleshipFireMove,
]);
