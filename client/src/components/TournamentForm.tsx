import type { TournamentRequestedGameMode } from "@gamenite/shared";
import { Box, Button, Input, Text, Textarea, VStack } from "@chakra-ui/react";
import { tournamentGameModeNames } from "../util/consts.ts";

export interface TournamentFormValues {
  title: string;
  description: string;
  startTime: string;
  requestedGameMode: TournamentRequestedGameMode | "";
  maxPlayers: "" | 2 | 4 | 8 | 16;
}

interface TournamentFormProps {
  heading: string;
  submitLabel: string;
  values: TournamentFormValues;
  err: string | null;
  onChange: (
    field: keyof TournamentFormValues,
    value: TournamentFormValues[keyof TournamentFormValues],
  ) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

/**
 * Renders the shared create/edit tournament form.
 */
export default function TournamentForm({
  heading,
  submitLabel,
  values,
  err,
  onChange,
  onSubmit,
}: TournamentFormProps) {
  const fieldStyles = {
    w: "full",
    maxW: "36rem",
    borderRadius: "lg",
    borderColor: "blackAlpha.200",
    bg: "white",
  };

  return (
    <form className="content" onSubmit={onSubmit}>
      <VStack className="pageShell" align="stretch" gap={5}>
        <VStack className="pageSurface pageHeader" align="stretch" gap={3}>
          <Text className="pageEyebrow">Bracket Setup</Text>
          <Text as="h2" className="pageTitle">
            {heading}
          </Text>
          <Text className="pageIntro">
            Configure the essentials, then let VersusHQ handle the bracket flow.
          </Text>
        </VStack>

        <VStack className="pageSurface formShell" align="stretch" gap={5}>
          <VStack align="stretch" gap={2}>
            <Text fontWeight="medium">Tournament name</Text>
            <Input
              value={values.title}
              onChange={(event) => onChange("title", event.target.value)}
              _focusVisible={{
                borderColor: "var(--accent-secondary)",
                boxShadow: "0 0 0 4px var(--focus-ring)",
              }}
              {...fieldStyles}
            />
          </VStack>

          <VStack align="stretch" gap={2}>
            <Text fontWeight="medium">Description</Text>
            <Textarea
              value={values.description}
              onChange={(event) => onChange("description", event.target.value)}
              minH="9rem"
              _focusVisible={{
                borderColor: "var(--accent-secondary)",
                boxShadow: "0 0 0 4px var(--focus-ring)",
              }}
              {...fieldStyles}
            />
          </VStack>

          <VStack align="stretch" gap={2}>
            <Text fontWeight="medium">Start time</Text>
            <Input
              type="datetime-local"
              value={values.startTime}
              onChange={(event) => onChange("startTime", event.target.value)}
              _focusVisible={{
                borderColor: "var(--accent-secondary)",
                boxShadow: "0 0 0 4px var(--focus-ring)",
              }}
              {...fieldStyles}
            />
          </VStack>

          <VStack align="stretch" gap={2}>
            <Text fontWeight="medium">Game</Text>
            <Box
              asChild
              w="full"
              maxW="36rem"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="blackAlpha.200"
              bg="white"
              overflow="hidden"
            >
              <select
                value={values.requestedGameMode}
                onChange={(event) =>
                  onChange(
                    "requestedGameMode",
                    event.target.value as TournamentRequestedGameMode | "",
                  )
                }
                style={{ padding: "10px 16px", width: "100%", background: "transparent" }}
              >
                <option value="">Select a game</option>
                {Object.entries(tournamentGameModeNames).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Box>
          </VStack>

          <VStack align="stretch" gap={2}>
            <Text fontWeight="medium">Max players</Text>
            <Box
              asChild
              w="full"
              maxW="36rem"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="blackAlpha.200"
              bg="white"
              overflow="hidden"
            >
              <select
                value={values.maxPlayers}
                onChange={(event) =>
                  onChange(
                    "maxPlayers",
                    event.target.value === "" ? "" : (Number(event.target.value) as 2 | 4 | 8 | 16),
                  )
                }
                style={{ padding: "10px 16px", width: "100%", background: "transparent" }}
              >
                <option value="">Select bracket size</option>
                {[2, 4, 8, 16].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Box>
          </VStack>

          {err && (
            <Text className="error-message" color="red.600">
              {err}
            </Text>
          )}

          <Button
            type="submit"
            alignSelf="start"
            bg="var(--accent-primary)"
            color="white"
            _hover={{ bg: "var(--accent-primary-hover)" }}
            borderRadius="full"
            px={6}
          >
            {submitLabel}
          </Button>
        </VStack>
      </VStack>
    </form>
  );
}
