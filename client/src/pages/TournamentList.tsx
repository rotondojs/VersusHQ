import { Box, Button, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import type { TournamentListItem } from "@gamenite/shared";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner.tsx";
import TournamentSummaryView from "../components/TournamentSummaryView.tsx";
import useTournamentList from "../hooks/useTournamentList.ts";

const STATUS_SECTIONS: Array<{
  title: string;
  emptyMessage: string;
  matches: (tournament: TournamentListItem) => boolean;
}> = [
  {
    title: "Upcoming Tournaments",
    emptyMessage: "No upcoming tournaments.",
    matches: (tournament) => tournament.status === "upcoming",
  },
  {
    title: "Active Tournaments",
    emptyMessage: "No active tournaments.",
    matches: (tournament) => tournament.status === "ongoing",
  },
  {
    title: "Completed Tournaments",
    emptyMessage: "No completed tournaments.",
    matches: (tournament) => tournament.status === "completed" || tournament.status === "cancelled",
  },
];

/**
 * Lists tournaments grouped by upcoming, active, and completed states.
 */
export default function TournamentList() {
  const { tournaments, isLoading, errorMessage, isEmpty } = useTournamentList();
  const navigate = useNavigate();

  return (
    <Box className="content">
      <VStack className="pageShell" align="stretch" gap={5} minH={0}>
        <Box className="pageSurface pageHeader">
          <Text className="pageEyebrow">Brackets</Text>
          <Box className="pageTitleRow">
            <Box>
              <Heading className="pageTitle">Tournaments</Heading>
              <Text className="pageIntro">
                Stay on top of upcoming events, active brackets, and finished runs.
              </Text>
            </Box>
            <Button
              onClick={() => navigate("/tournament/new")}
              bg="var(--accent-primary)"
              color="white"
              _hover={{ bg: "var(--accent-primary-hover)" }}
              borderRadius="full"
              px={6}
            >
              Create Tournament
            </Button>
          </Box>
        </Box>
        {isLoading ? (
          <LoadingSpinner label="Loading tournaments..." />
        ) : errorMessage ? (
          <Text className="error-message">Error: {errorMessage}</Text>
        ) : isEmpty ? (
          <Text>No tournaments found...</Text>
        ) : (
          <SimpleGrid columns={{ base: 1, xl: 3 }} gap={6} flex={1} minH={0} alignItems="stretch">
            {STATUS_SECTIONS.map(({ title, emptyMessage, matches }) => {
              const statusTournaments = tournaments.filter(matches);

              return (
                <VStack
                  key={title}
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
                      {statusTournaments.length} tournament
                      {statusTournaments.length === 1 ? "" : "s"}
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
                    {statusTournaments.length === 0 ? (
                      <Text color="var(--fg-secondary)">{emptyMessage}</Text>
                    ) : (
                      statusTournaments.map((tournament) => (
                        <TournamentSummaryView {...tournament} key={tournament.tournamentId} />
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
