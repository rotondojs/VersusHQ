import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { CreateTournamentRequest } from "@gamenite/shared";
import TournamentForm, { type TournamentFormValues } from "../components/TournamentForm.tsx";
import useAuth from "../hooks/useAuth.ts";
import { createTournament } from "../services/tournamentService.ts";

const initialValues: TournamentFormValues = {
  title: "",
  description: "",
  startTime: "",
  requestedGameMode: "",
  maxPlayers: "",
};

/**
 * Screen for creating a new tournament.
 */
export default function NewTournament() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<TournamentFormValues>(initialValues);
  const [err, setErr] = useState<string | null>(null);

  /**
   * Updates one tournament-form field in local state.
   */
  const handleChange = (
    field: keyof TournamentFormValues,
    value: TournamentFormValues[keyof TournamentFormValues],
  ) => {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
  };

  /**
   * Validates the form and submits the create-tournament request.
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      values.title.trim() === "" ||
      values.description.trim() === "" ||
      values.startTime === "" ||
      values.requestedGameMode === "" ||
      values.maxPlayers === ""
    ) {
      setErr("All fields are required.");
      return;
    }

    const payload: CreateTournamentRequest = {
      title: values.title.trim(),
      description: values.description.trim(),
      startTime: new Date(values.startTime),
      requestedGameMode: values.requestedGameMode,
      maxPlayers: values.maxPlayers,
    };

    const tournament = await createTournament(auth, payload);
    if ("error" in tournament) {
      setErr(tournament.error);
      return;
    }

    navigate(`/tournament/${tournament.tournamentId}`);
  };

  return (
    <TournamentForm
      heading="Create tournament"
      submitLabel="Create Tournament"
      values={values}
      err={err}
      onChange={handleChange}
      onSubmit={handleSubmit}
    />
  );
}
