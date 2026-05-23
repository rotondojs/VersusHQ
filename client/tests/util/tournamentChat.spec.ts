import { describe, expect, it } from "vitest";
import { resolveTournamentChatRole } from "../../src/util/tournamentChat.ts";

function makeUser(username: string, display: string) {
  return {
    username,
    display,
    points: 0,
    createdAt: new Date("2026-04-02T14:00:00.000Z"),
  };
}

describe("resolveTournamentChatRole", () => {
  const hostUser = makeUser("host-user", "Host User");
  const playerUser = makeUser("player-user", "Player User");
  const tournament = {
    hostUser,
    participants: [hostUser, playerUser],
  };

  it("gives host precedence over participant membership", () => {
    expect(resolveTournamentChatRole(tournament, hostUser.username)).toBe("host");
  });

  it("classifies non-host participants as participants", () => {
    expect(resolveTournamentChatRole(tournament, playerUser.username)).toBe("participant");
  });

  it("classifies everyone else as spectators", () => {
    expect(resolveTournamentChatRole(tournament, "spectator-user")).toBe("spectator");
  });
});
