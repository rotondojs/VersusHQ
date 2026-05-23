import type { TournamentInfo } from "@gamenite/shared";

export type TournamentChatRole = "host" | "participant" | "spectator";

/**
 * Resolves a chat sender's current tournament role for role-aware message styling.
 */
export function resolveTournamentChatRole(
  tournament: Pick<TournamentInfo, "hostUser" | "participants">,
  username: string,
): TournamentChatRole {
  if (tournament.hostUser.username === username) {
    return "host";
  }

  if (tournament.participants.some((participant) => participant.username === username)) {
    return "participant";
  }

  return "spectator";
}
