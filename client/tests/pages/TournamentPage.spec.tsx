import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { TournamentInfo } from "@gamenite/shared";
import TournamentPage from "../../src/pages/TournamentPage.tsx";

const mocks = vi.hoisted(() => ({
  useSocketsForTournament: vi.fn(),
  useLoginContext: vi.fn(),
  useAuth: vi.fn(),
  chatPanel: vi.fn(({ chatId }: { chatId: string }) => <div>Chat panel {chatId}</div>),
}));

vi.mock("../../src/hooks/useSocketsForTournament.ts", () => ({
  default: mocks.useSocketsForTournament,
}));

vi.mock("../../src/hooks/useLoginContext.ts", () => ({
  default: mocks.useLoginContext,
}));

vi.mock("../../src/hooks/useAuth.ts", () => ({
  default: mocks.useAuth,
}));

vi.mock("../../src/components/ChatPanel.tsx", () => ({
  default: mocks.chatPanel,
}));

vi.mock("../../src/components/TournamentGamesList.tsx", () => ({
  default: () => <div>Mock match list</div>,
}));

vi.mock("../../src/components/TournamentBracketView.tsx", () => ({
  default: () => <div>Mock bracket</div>,
}));

function makeUser(username: string, display: string) {
  return {
    username,
    display,
    points: 0,
    createdAt: new Date("2026-04-02T14:00:00.000Z"),
  };
}

describe("TournamentPage", () => {
  const hostUser = makeUser("host-user", "Host User");
  const participantUser = makeUser("participant-user", "Participant User");
  const tournament: TournamentInfo = {
    tournamentId: "tournament-123",
    hostUser,
    title: "Spring Chat Cup",
    creationTime: new Date("2026-04-02T14:00:00.000Z"),
    startTime: new Date("2026-04-03T14:00:00.000Z"),
    chat: "chat-123",
    status: "upcoming",
    requestedGameMode: "nim",
    maxPlayers: 4,
    participants: [hostUser, participantUser],
    description: "Testing the tournament chat tab.",
    bracket: null,
  };

  beforeEach(() => {
    mocks.useSocketsForTournament.mockReset();
    mocks.useLoginContext.mockReset();
    mocks.useAuth.mockReset();
    mocks.chatPanel.mockClear();

    mocks.useSocketsForTournament.mockReturnValue({
      tournament,
      isLoading: false,
      errorMessage: null,
      setTournament: vi.fn(),
    });
    mocks.useLoginContext.mockReturnValue({
      user: hostUser,
      pass: "pwd0000",
      reset: () => undefined,
      socket: {},
    });
    mocks.useAuth.mockReturnValue({ username: hostUser.username, password: "pwd0000" });
  });

  it("renders the chat tab and wires tournament chat roles into the chat panel", () => {
    render(
      <MemoryRouter initialEntries={["/tournament/tournament-123"]}>
        <Routes>
          <Route path="/tournament/:tournamentId" element={<TournamentPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Chat" }));

    expect(screen.getByText("Chat panel chat-123")).toBeVisible();
    expect(screen.getByText("Host", { selector: ".tournament-chat-legend-item" })).toBeVisible();
    expect(
      screen.getByText("Participant", { selector: ".tournament-chat-legend-item" }),
    ).toBeVisible();
    expect(
      screen.getByText("Spectator", { selector: ".tournament-chat-legend-item" }),
    ).toBeVisible();

    const chatPanelProps = mocks.chatPanel.mock.calls.at(-1)?.[0] as {
      chatId: string;
      resolveBubbleRole: (username: string) => "host" | "participant" | "spectator";
    };

    expect(chatPanelProps.chatId).toBe("chat-123");
    expect(chatPanelProps.resolveBubbleRole(hostUser.username)).toBe("host");
    expect(chatPanelProps.resolveBubbleRole(participantUser.username)).toBe("participant");
    expect(chatPanelProps.resolveBubbleRole("spectator-user")).toBe("spectator");
  });
});
