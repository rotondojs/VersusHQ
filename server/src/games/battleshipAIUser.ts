/**
 * Synthetic user identity metadata for server-side Battleship AI opponents.
 */
import { type SafeUserInfo } from "@gamenite/shared";

export const BATTLESHIP_AI_USER_ID = "__battleship_ai__";
export const BATTLESHIP_AI_USERNAME = "__battleship_ai__";

export const battleshipAiUserInfo: SafeUserInfo = {
  username: BATTLESHIP_AI_USERNAME,
  display: "Battleship AI",
  points: 0,
  createdAt: new Date(0),
};

/**
 * Returns whether the supplied user id belongs to the synthetic Battleship AI user.
 */
export function isBattleshipAiUserId(userId: string): boolean {
  return userId === BATTLESHIP_AI_USER_ID;
}
