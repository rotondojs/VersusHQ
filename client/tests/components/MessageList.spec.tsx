import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { SafeUserInfo } from "@gamenite/shared";
import type { ChatMessage, GameSocket } from "../../src/util/types.ts";
import { LoginContext } from "../../src/contexts/LoginContext.ts";
import MessageList from "../../src/components/MessageList.tsx";

function makeUser(username: string, display: string): SafeUserInfo {
  return {
    username,
    display,
    points: 0,
    createdAt: new Date("2026-04-02T14:00:00.000Z"),
  };
}

describe("MessageList", () => {
  it("applies tournament role styling while preserving self vs other alignment", () => {
    const hostUser = makeUser("host-user", "Host User");
    const participantUser = makeUser("participant-user", "Participant User");
    const spectatorUser = makeUser("spectator-user", "Spectator User");

    const messages: ChatMessage[] = [
      {
        messageId: "host-message",
        text: "Host update",
        createdBy: hostUser,
        createdAt: new Date("2026-04-02T14:01:00.000Z"),
      },
      {
        messageId: "participant-message",
        text: "Participant update",
        createdBy: participantUser,
        createdAt: new Date("2026-04-02T14:02:00.000Z"),
      },
      {
        messageId: "spectator-message",
        text: "Spectator update",
        createdBy: spectatorUser,
        createdAt: new Date("2026-04-02T14:03:00.000Z"),
      },
    ];

    render(
      <MemoryRouter>
        <LoginContext.Provider
          value={{
            user: hostUser,
            pass: "pwd0000",
            reset: () => undefined,
            socket: {} as GameSocket,
          }}
        >
          <MessageList
            messages={messages}
            resolveBubbleRole={(username) => {
              if (username === hostUser.username) {
                return "host";
              }
              if (username === participantUser.username) {
                return "participant";
              }
              return "spectator";
            }}
          />
        </LoginContext.Provider>
      </MemoryRouter>,
    );

    const hostBubble = screen.getByText("Host update").closest(".chatMessage");
    const participantBubble = screen.getByText("Participant update").closest(".chatMessage");
    const spectatorBubble = screen.getByText("Spectator update").closest(".chatMessage");

    expect(hostBubble).toHaveAttribute("data-chat-role", "host");
    expect(hostBubble).toHaveClass("chatMe");

    expect(participantBubble).toHaveAttribute("data-chat-role", "participant");
    expect(participantBubble).toHaveClass("chatOther");

    expect(spectatorBubble).toHaveAttribute("data-chat-role", "spectator");
    expect(spectatorBubble).toHaveClass("chatOther");
  });
});
