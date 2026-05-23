import { useEffect, useState } from "react";
import { Box, Text } from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import type { EditTournamentRequest } from "@gamenite/shared";
import TournamentForm, { type TournamentFormValues } from "../components/TournamentForm.tsx";
import useTournamentInfo, { type UseTournamentInfoResult } from "../hooks/useTournamentInfo.ts";
import useAuth from "../hooks/useAuth.ts";
import { editTournament } from "../services/tournamentService.ts";
import LoadingSpinner from "../components/LoadingSpinner.tsx";

/**
 * Converts a date into the local `datetime-local` input format used by the edit form.
 */
function toDateTimeInputValue(date: string | Date): string {
  const resolved = typeof date === "string" ? new Date(date) : date;
  return new Date(resolved.getTime() - resolved.getTimezoneOffset() * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

/**
 * Screen for editing an existing tournament before it begins.
 */
export default function EditTournament() {
  const { tournamentId } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const { tournamentInfo, isLoading, errorMessage }: UseTournamentInfoResult = useTournamentInfo(
    tournamentId!,
  );
  const [values, setValues] = useState<TournamentFormValues>({
    title: "",
    description: "",
    startTime: "",
    requestedGameMode: "",
    maxPlayers: "",
  });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentInfo) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues({
      title: tournamentInfo.title,
      description: tournamentInfo.description,
      startTime: toDateTimeInputValue(tournamentInfo.startTime),
      requestedGameMode: tournamentInfo.requestedGameMode,
      maxPlayers: tournamentInfo.maxPlayers as TournamentFormValues["maxPlayers"],
    });
  }, [tournamentInfo]);

  if (isLoading) {
    return <LoadingSpinner label="Loading tournament..." />;
  }

  if (errorMessage) {
    return (
      <Box className="content">
        <Text className="error-message" color="red.600">
          Error: {errorMessage}
        </Text>
      </Box>
    );
  }

  if (!tournamentInfo) {
    return (
      <Box className="content">
        <Text>Tournament not found.</Text>
      </Box>
    );
  }

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
   * Validates the form and submits the tournament update request.
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

    const payload: EditTournamentRequest = {
      title: values.title.trim(),
      description: values.description.trim(),
      startTime: new Date(values.startTime),
      requestedGameMode: values.requestedGameMode,
      maxPlayers: values.maxPlayers,
    };

    const tournament = await editTournament(auth, tournamentInfo.tournamentId, payload);
    if ("error" in tournament) {
      setErr(tournament.error);
      return;
    }

    navigate(`/tournament/${tournament.tournamentId}`);
  };

  return (
    <TournamentForm
      heading="Edit tournament"
      submitLabel="Save Tournament"
      values={values}
      err={err}
      onChange={handleChange}
      onSubmit={handleSubmit}
    />
  );
}
