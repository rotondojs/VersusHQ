import type { GameInfo } from "@gamenite/shared";
import { useNavigate } from "react-router-dom";
import { gameNames } from "../util/consts.ts";
import useTimeSince from "../hooks/useTimeSince.ts";
import { Box, HStack, VStack, Avatar, Text, Flex } from "@chakra-ui/react";

/**
 * Summarizes information for a single game as a Chakra UI card
 */
export default function GameSummaryView({
  gameId,
  status,
  type,
  players,
  createdAt,
  createdBy,
}: GameInfo) {
  const timeSince = useTimeSince();
  const navigate = useNavigate();
  const numPlayers = players.length;

  return (
    <Box
      role="listitem"
      borderWidth="1px"
      borderColor="var(--surface-outline)"
      borderRadius="2xl"
      p={5}
      bg="var(--surface-strong)"
      boxShadow="var(--shadow-soft)"
      _hover={{
        boxShadow: "var(--shadow-strong)",
        transform: "translateY(-4px)",
        cursor: "pointer",
        borderColor: "var(--border-color)",
      }}
      transition="all 0.18s ease"
      onClick={() => navigate(`/game/${gameId}`)}
      w="100%"
    >
      <Flex justify="space-between" align="flex-start">
        <VStack align="flex-start" gap={2} flex={1}>
          <HStack gap={2}>
            {status !== "done" && (
              <Text
                fontSize="xs"
                color="var(--fg-secondary)"
                px={2.5}
                py={1}
                borderRadius="full"
                bg="var(--bg-tertiary)"
              >
                {numPlayers} player{numPlayers === 1 ? "" : "s"}
              </Text>
            )}
          </HStack>

          <Text fontWeight="bold" fontSize="lg" color="var(--fg-primary)">
            A game of {gameNames[type]}
          </Text>

          <HStack gap={2} mt={1}>
            <Avatar.Root size="xs">
              <Avatar.Fallback name={createdBy.display} />
              {createdBy.picture && <Avatar.Image src={createdBy.picture} />}
            </Avatar.Root>
            <Text fontSize="sm" color="var(--fg-secondary)">
              {createdBy.display} · created {timeSince(createdAt)}
            </Text>
          </HStack>
        </VStack>
      </Flex>
    </Box>
  );
}
