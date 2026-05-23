import { z } from "zod";
import { zUserAuth } from "./auth.types.ts";
import type { TournamentRequestedGameMode } from "./games/tournaments/tournament.types.ts";

/**
 * Represents a "safe" user object that excludes sensitive information like
 * the password, suitable for exposing to clients.
 * - `username`: unique username of the user
 * - `display`: user's display name
 * - `createdAt`: when the user registered
 * - `lastLogin`: when the user last logged in
 * - `picture`: user's profile picture URL
 * - `email`: user's email address
 * - `name`: user's full name
 * - `bio`: user's profile bio
 */
export interface SafeUserInfo {
  username: string;
  createdAt: Date;
  display: string;
  points: number;
  lastLogin?: Date;
  picture?: string;
  email?: string;
  name?: string;
  bio?: string;
  theme?: string;
  tournaments?: TournamentSummary[];
}

/**
 * A summary of a tournament that a user has participated in, used for displaying
 * tournament history on user profiles. It includes:
 * - `tournamentId`: unique identifier for the tournament
 * - `name`: name of the tournament
 * - `gameType`: the game mode of the tournament
 * - `createdAt`: when the tournament was created
 * - `placement`: the user's placement in the tournament (1 for winner, >1 for placement, -1 for no placement)
 * - `hosted`: whether the user hosted the tournament
 */
export interface TournamentSummary {
  tournamentId: string;
  name: string;
  gameType: TournamentRequestedGameMode;
  createdAt: Date;
  placement: number;
  participantCount: number;
  hosted: boolean;
}

/*** TYPES USED IN THE USER API ***/

/**
 * Represents allowed updates to a user.
 */
export type UserUpdateRequest = z.infer<typeof zUserUpdateRequest>;
export const zUserUpdateRequest = z.object({
  password: z.string().optional(),
  googleId: z.string().optional(),
  display: z.string().optional(),
  email: z.string().optional(),
  picture: z.string().optional(),
  name: z.string().optional(),
  bio: z.string().optional(),
  theme: z.string().optional(),
  lastLogin: z.coerce.date().optional(),
});

export const zUserPictureUpload = z.object({
  auth: zUserAuth,
  pictureDataUrl: z.string(),
});

export type UserPictureUploadRequest = z.infer<typeof zUserPictureUpload>;
