import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TournamentForm from "../../src/components/TournamentForm.tsx";

const chakraSystem = createSystem(defaultConfig);

describe("TournamentForm", () => {
  it("renders the supplied values and forwards changes", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <ChakraProvider value={chakraSystem}>
        <TournamentForm
          heading="Create tournament"
          submitLabel="Create Tournament"
          values={{
            title: "Starter Cup",
            description: "A seeded tournament.",
            startTime: "2026-03-12T18:00",
            requestedGameMode: "nim",
            maxPlayers: 4,
          }}
          err={null}
          onChange={onChange}
          onSubmit={onSubmit}
        />
      </ChakraProvider>,
    );

    expect(screen.getByDisplayValue("Starter Cup")).toBeVisible();
    expect(screen.getByDisplayValue("A seeded tournament.")).toBeVisible();

    fireEvent.change(screen.getByDisplayValue("Starter Cup"), { target: { value: "Updated Cup" } });
    expect(onChange).toHaveBeenCalledWith("title", "Updated Cup");

    fireEvent.submit(screen.getByRole("button", { name: /Create Tournament/i }).closest("form")!);
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
