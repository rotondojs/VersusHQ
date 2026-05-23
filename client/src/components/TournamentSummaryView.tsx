import type { TournamentListItem } from "@gamenite/shared";
import { Avatar, Badge, Box, HStack, Text, VStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import useTimeSince from "../hooks/useTimeSince.ts";
import { tournamentGameModeNames } from "../util/consts.ts";

const statusPalette: Record<TournamentListItem["status"], string> = {
  upcoming: "blue",
  ongoing: "green",
  completed: "gray",
  cancelled: "red",
};

const statusLabel: Record<TournamentListItem["status"], string> = {
  upcoming: "Upcoming",
  ongoing: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

/**
 * Displays one tournament summary card in the tournament list.
 */
export default function TournamentSummaryView({
  tournamentId,
  title,
  creationTime,
  status,
  requestedGameMode,
  resolvedGameMode,
  maxPlayers,
  participants,
  startTime,
  hostUser,
  winner,
}: TournamentListItem) {
  const navigate = useNavigate();
  const timeSince = useTimeSince();
  const displayMode = resolvedGameMode ?? requestedGameMode;

  return (
    <Box role="listitem" w="100%">
      <Box
        as="button"
        w="100%"
        borderWidth="1px"
        borderColor="var(--surface-outline)"
        borderRadius="2xl"
        p={5}
        bg="var(--surface-strong)"
        boxShadow="var(--shadow-soft)"
        textAlign="left"
        cursor="pointer"
        _hover={{
          boxShadow: "var(--shadow-strong)",
          transform: "translateY(-4px)",
          borderColor: "var(--border-color)",
        }}
        _focusVisible={{
          outline: "2px solid",
          outlineColor: "var(--accent-secondary)",
          outlineOffset: "2px",
        }}
        transition="all 0.18s ease"
        onClick={() => navigate(`/tournament/${tournamentId}`)}
      >
        <VStack align="stretch" gap={4}>
          <HStack justify="space-between" align="flex-start">
            <VStack align="stretch" gap={1} flex={1}>
              <Text fontWeight="bold" fontSize="lg" lineHeight="shorter" color="var(--fg-primary)">
                {title}
              </Text>
              <Text fontSize="sm" color="var(--fg-secondary)">
                {tournamentGameModeNames[displayMode]} tournament
              </Text>
            </VStack>
            <Badge
              colorPalette={statusPalette[status]}
              variant="subtle"
              borderRadius="full"
              px={3}
              py={1}
              textTransform="uppercase"
              letterSpacing="0.08em"
            >
              {statusLabel[status]}
            </Badge>
          </HStack>

          <HStack gap={6} align="flex-start" flexWrap="wrap">
            <VStack align="stretch" gap={0} minW="7rem">
              <Text
                fontSize="xs"
                textTransform="uppercase"
                color="var(--fg-muted)"
                letterSpacing="wide"
              >
                Players
              </Text>
              <Text fontWeight="semibold" color="var(--fg-primary)">
                {participants.length}/{maxPlayers}
              </Text>
            </VStack>
            <VStack align="stretch" gap={0} minW="10rem">
              <Text
                fontSize="xs"
                textTransform="uppercase"
                color="var(--fg-muted)"
                letterSpacing="wide"
              >
                Starts
              </Text>
              <Text fontWeight="semibold" color="var(--fg-primary)">
                {new Date(startTime).toLocaleString()}
              </Text>
            </VStack>
          </HStack>

          <HStack gap={3} align="center">
            <Avatar.Root size="sm">
              <Avatar.Fallback name={hostUser.display} />
              {hostUser.picture && <Avatar.Image src={hostUser.picture} />}
            </Avatar.Root>
            <VStack align="stretch" gap={0}>
              <Text fontSize="sm" fontWeight="medium" color="var(--fg-primary)">
                {hostUser.display}
              </Text>
              <Text fontSize="sm" color="var(--fg-secondary)">
                Host
              </Text>
            </VStack>
          </HStack>

          <VStack align="stretch" gap={1}>
            <Text fontSize="sm" color="var(--fg-secondary)">
              Created {timeSince(creationTime)}
            </Text>
            {winner && (
              <Text fontSize="sm" color="var(--fg-secondary)">
                Winner: {winner.display}
              </Text>
            )}
          </VStack>
        </VStack>
      </Box>
    </Box>
  );
}
