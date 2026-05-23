import { Box, Button, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import type { GameInfo } from "@gamenite/shared";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner.tsx";
import GameSummaryView from "../components/GameSummaryView.tsx";
import useGameList from "../hooks/useGameList.ts";

const STATUS_SECTIONS: Array<{
  status: GameInfo["status"];
  title: string;
  emptyMessage: string;
}> = [
  { status: "waiting", title: "Waiting Games", emptyMessage: "No waiting games." },
  { status: "active", title: "Ongoing Games", emptyMessage: "No ongoing games." },
  { status: "done", title: "Completed Games", emptyMessage: "No finished games." },
];

/**
 * Lists standalone games grouped by waiting, ongoing, and completed status.
 */
export default function GameList() {
  const { games, isLoading, errorMessage, isEmpty } = useGameList();
  const navigate = useNavigate();
  const standaloneGames = games.filter((game) => !game.tournamentId);

  return (
    <Box className="content">
      <VStack className="pageShell" align="stretch" gap={5} minH={0}>
        <Box className="pageSurface pageHeader">
          <Text className="pageEyebrow">Matches</Text>
          <Box className="pageTitleRow">
            <Box>
              <Heading className="pageTitle">Games</Heading>
              <Text className="pageIntro">
                Browse waiting matches, ongoing rooms, and recently completed sessions.
              </Text>
            </Box>
            <Button
              onClick={() => navigate("/game/new")}
              bg="var(--accent-primary)"
              color="white"
              _hover={{ bg: "var(--accent-primary-hover)" }}
              borderRadius="full"
              px={6}
            >
              Create New Game
            </Button>
          </Box>
        </Box>
        {isLoading ? (
          <LoadingSpinner label="Loading games..." />
        ) : errorMessage ? (
          <Text className="error-message">Error: {errorMessage}</Text>
        ) : isEmpty ? (
          <Text>No games found...</Text>
        ) : (
          <SimpleGrid columns={{ base: 1, xl: 3 }} gap={6} flex={1} minH={0} alignItems="stretch">
            {STATUS_SECTIONS.map(({ status, title, emptyMessage }) => {
              const statusGames = standaloneGames.filter((game) => game.status === status);

              return (
                <VStack
                  key={status}
                  align="stretch"
                  gap={4}
                  minH={0}
                  h="full"
                  p={5}
                  borderWidth="1px"
                  borderColor="var(--surface-outline)"
                  borderRadius="2xl"
                  bg="var(--surface-glass)"
                  boxShadow="var(--shadow-soft)"
                  backdropFilter="blur(18px)"
                >
                  <VStack align="stretch" gap={1}>
                    <Heading size="md" color="var(--fg-primary)">
                      {title}
                    </Heading>
                    <Text fontSize="sm" color="var(--fg-secondary)">
                      {statusGames.length} game{statusGames.length === 1 ? "" : "s"}
                    </Text>
                  </VStack>
                  <VStack
                    align="stretch"
                    gap={4}
                    flex={1}
                    minH={0}
                    overflowY="auto"
                    pr={2}
                    role="list"
                  >
                    {statusGames.length === 0 ? (
                      <Text color="var(--fg-secondary)">{emptyMessage}</Text>
                    ) : (
                      statusGames.map((game) => (
                        <GameSummaryView {...game} key={game.gameId.toString()} />
                      ))
                    )}
                  </VStack>
                </VStack>
              );
            })}
          </SimpleGrid>
        )}
      </VStack>
    </Box>
  );
}
