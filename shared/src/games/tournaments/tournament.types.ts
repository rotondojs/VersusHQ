import { z } from "zod";
import type { SafeUserInfo } from "../../user.types.ts";
import { zGameKey } from "../../game.types.ts";

/**
 * Tournament-specific game choices. `random` means the bracket will resolve to
 * one concrete game once the tournament becomes active.
 */
export type TournamentRequestedGameMode = z.infer<typeof zTournamentRequestedGameMode>;
export const zTournamentRequestedGameMode = z.union([
  zGameKey,
  z.literal("battleship"),
  z.literal("random"),
]);

/**
 * A started tournament must resolve to a concrete game implementation.
 */
export type TournamentResolvedGameMode = z.infer<typeof zTournamentResolvedGameMode>;
export const zTournamentResolvedGameMode = z.union([zGameKey, z.literal("battleship")]);

/**
 * Status values used to group tournaments across the UI.
 */
export type TournamentStatus = z.infer<typeof zTournamentStatus>;
export const zTournamentStatus = z.union([
  z.literal("upcoming"),
  z.literal("ongoing"),
  z.literal("completed"),
  z.literal("cancelled"),
]);

/**
 * Tournament sizes must support a proper single-elimination bracket.
 */
export function isPowerOfTwo(value: number): boolean {
  return value >= 2 && Number.isInteger(Math.log2(value));
}

export type TournamentMaxPlayers = z.infer<typeof zTournamentMaxPlayers>;
export const zTournamentMaxPlayers = z
  .int()
  .min(2)
  .refine(isPowerOfTwo, { message: "maxPlayers must be a power of two" });

/**
 * Information needed to show a tournament in list and card views.
 */
export interface TournamentListItem {
  tournamentId: string;
  hostUser: SafeUserInfo;
  title: string;
  creationTime: Date;
  startTime: Date;
  status: TournamentStatus;
  requestedGameMode: TournamentRequestedGameMode;
  resolvedGameMode?: TournamentResolvedGameMode;
  maxPlayers: TournamentMaxPlayers;
  participants: SafeUserInfo[];
  placements?: { [userId: string]: number };
  winner?: SafeUserInfo;
}

/**
 * Detailed tournament information used by the tournament page.
 */
export interface TournamentInfo extends TournamentListItem {
  description: string;
  chat: string;
  bracket: TournamentBracket | null;
}

/**
 * The payload needed to create a tournament.
 */
export type CreateTournamentRequest = z.infer<typeof zCreateTournamentRequest>;
export const zCreateTournamentRequest = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  startTime: z.coerce.date(),
  requestedGameMode: zTournamentRequestedGameMode,
  maxPlayers: zTournamentMaxPlayers,
});

/**
 * The payload needed to edit a tournament before it starts.
 */
export type EditTournamentRequest = z.infer<typeof zEditTournamentRequest>;
export const zEditTournamentRequest = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    startTime: z.coerce.date().optional(),
    requestedGameMode: zTournamentRequestedGameMode.optional(),
    maxPlayers: zTournamentMaxPlayers.optional(),
  })
  .refine(
    (update) => Object.values(update).some((value) => value !== undefined),
    "At least one field must be provided",
  );

/**
 * Filters used by the tournament list page.
 */
export type TournamentListFilter = z.infer<typeof zTournamentListFilter>;
export const zTournamentListFilter = z
  .object({
    status: zTournamentStatus.optional(),
    hostUsername: z.string().optional(),
  })
  .optional();

/**
 * Represents a tournament bracket for frontend display.
 */
export interface TournamentBracket {
  root: BracketNode;
}

/**
 * A single bracket node. Internal nodes represent future rounds and may have
 * unresolved players until earlier matches finish.
 */
export interface BracketNode {
  matchId: string;
  players: [SafeUserInfo | null, SafeUserInfo | null];
  winner?: SafeUserInfo;
  children?: [BracketNode, BracketNode];
}

/**
 * Utility type for code that needs the set of concrete tournament games.
 */
export type ConcreteTournamentGameMode = Exclude<TournamentRequestedGameMode, "random">;
