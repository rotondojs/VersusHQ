import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import TournamentBracketView from "../../src/components/TournamentBracketView.tsx";

describe("TournamentBracketView", () => {
  it("shows a placeholder when no bracket exists yet", () => {
    render(
      <MemoryRouter>
        <TournamentBracketView bracket={null} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Bracket will appear once the tournament starts/i)).toBeVisible();
  });

  it("renders nested bracket matches and winners", () => {
    const { container } = render(
      <MemoryRouter>
        <TournamentBracketView
          bracket={{
            root: {
              matchId: "rootmatch",
              players: [
                {
                  username: "user0",
                  points: 400,
                  display: "User 0",
                  createdAt: new Date("2025-01-01"),
                },
                {
                  username: "user1",
                  points: 400,
                  display: "User 1",
                  createdAt: new Date("2025-01-01"),
                },
              ],
              winner: {
                username: "user0",
                display: "User 0",
                points: 400,
                createdAt: new Date("2025-01-01"),
              },
              children: [
                {
                  matchId: "childone",
                  players: [
                    {
                      username: "user0",
                      display: "User 0",
                      points: 100,
                      createdAt: new Date("2025-01-01"),
                    },
                    null,
                  ],
                },
                {
                  matchId: "childtwo",
                  players: [
                    {
                      username: "user1",
                      display: "User 1",
                      points: 200,
                      createdAt: new Date("2025-01-01"),
                    },
                    null,
                  ],
                },
              ],
            },
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Finals")).toBeVisible();
    expect(screen.getByText(/Match #3/i)).toBeVisible();
    expect(container.querySelector(".player-slot.winner")).not.toBeNull();
    expect(container.querySelector(".player-text.winner")).toHaveTextContent("User 0");
    expect(screen.getAllByText(/TBD/i)).toHaveLength(2);
  });
});
