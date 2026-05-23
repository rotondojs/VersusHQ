import { useState } from "react";
import "./Leaderboard.css";
import { NavLink } from "react-router-dom";
import { Avatar, Box, Flex, Heading, HStack, Link, Text, VStack } from "@chakra-ui/react";
import LoadingSpinner from "../components/LoadingSpinner.tsx";
import useLeaderboard from "../hooks/useLeaderboard.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import { tournamentGameModeNames } from "../util/consts.ts";

/**
 * Displays ranked users with optional filters for size, game, and time window.
 */
export default function Leaderboard() {
  const { user } = useLoginContext();
  const [limit, setLimit] = useState<number>(10);
  const [gameType, setGameType] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<"all" | "week" | "month" | "year">("all");
  const { rankings, currentUserEntry, isLoading, errorMessage, isEmpty } = useLeaderboard(
    user.username,
    { limit, gameType, dateRange },
  );
  if (isLoading) {
    return <LoadingSpinner label="Loading leaderboard..." />;
  }

  if (errorMessage) {
    return (
      <Flex minH="calc(100vh - 120px)" align="center" justify="center" px={4}>
        <Box
          w="full"
          maxW="56rem"
          p={6}
          borderWidth="1px"
          borderColor="red.200"
          bg="red.50"
          rounded="xl"
        >
          <Text color="red.700" fontWeight="semibold">
            Error: {errorMessage}
          </Text>
        </Box>
      </Flex>
    );
  }

  return (
    <Flex
      className="leaderboardPage"
      minH="calc(100vh - 120px)"
      align="center"
      justify="center"
      px={4}
      py={6}
    >
      <Box
        className="leaderboardPanel"
        w="full"
        maxW="64rem"
        borderWidth="1px"
        borderColor="var(--surface-outline)"
        rounded="2xl"
        p={{ base: 5, md: 8 }}
        shadow="var(--shadow-strong)"
        bg="var(--surface-glass)"
        backdropFilter="blur(18px)"
      >
        <VStack align="stretch" gap={5}>
          <Text className="pageEyebrow leaderboardEyebrow">Rankings</Text>
          <Heading as="h2" className="pageTitle">
            Global Leaderboard
          </Heading>
          <HStack gap={4} wrap="wrap">
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
              <option value={0}>All</option>
            </select>
            <select value={gameType ?? ""} onChange={(e) => setGameType(e.target.value || null)}>
              <option value="">All games</option>
              {Object.entries(tournamentGameModeNames)
                .filter(([key]) => key !== "random")
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as "all" | "week" | "month" | "year")}
            >
              <option value="all">All time</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
            </select>
          </HStack>
          <Text className="pageIntro">
            See who is setting the pace across the platform and where you sit in the table.
          </Text>

          <VStack align="stretch" gap={3}>
            <Heading as="h3" size="md" color="var(--fg-primary)">
              Top 10 Players
            </Heading>
            {isEmpty ? (
              <Text>No users available.</Text>
            ) : (
              <VStack align="stretch" gap={3} role="list">
                {rankings.map((entry, index) => (
                  <HStack
                    key={entry.user.username}
                    className={`leaderboardRow ${
                      entry.user.username === user.username ? "leaderboardRow-current" : ""
                    } ${
                      entry.rank <= 3 ? `leaderboardRow-top leaderboardRow-top-${entry.rank}` : ""
                    }`}
                    role="listitem"
                    justify="space-between"
                    align="center"
                    borderWidth="1px"
                    borderColor="var(--surface-outline)"
                    rounded="xl"
                    p={4}
                    bg="var(--surface-strong)"
                    style={{ animationDelay: `${120 + index * 70}ms` }}
                  >
                    <HStack gap={3} minW={0}>
                      <Text
                        className={`leaderboardRank ${
                          entry.rank <= 3 ? `leaderboardRank-top-${entry.rank}` : ""
                        }`}
                        fontWeight="bold"
                        minW="3.25rem"
                        color="var(--accent-primary)"
                      >
                        #{entry.rank}
                      </Text>
                      <Avatar.Root className="leaderboardAvatar" size="sm" shape="full">
                        <Avatar.Fallback name={entry.user.display} />
                        <Avatar.Image src={entry.user.picture} alt={entry.user.display} />
                      </Avatar.Root>
                      <Link
                        asChild
                        color="var(--accent-primary)"
                        fontWeight="semibold"
                        _hover={{ textDecor: "underline" }}
                      >
                        <NavLink to={`/profile/${entry.user.username}`}>
                          {entry.user.display}
                        </NavLink>
                      </Link>
                    </HStack>
                    <Text className="leaderboardPoints" fontWeight="semibold">
                      {entry.points} pts
                    </Text>
                  </HStack>
                ))}
              </VStack>
            )}
          </VStack>

          <Box
            className="leaderboardCurrentCard"
            borderTopWidth="1px"
            borderColor="var(--surface-outline)"
            pt={4}
          >
            <Heading as="h3" size="sm" mb={2}>
              Your Ranking
            </Heading>
            {currentUserEntry ? (
              <HStack
                justify="space-between"
                align="center"
                borderWidth="2px"
                borderColor="blue.300"
                rounded="lg"
                p={3}
                bg="blue.50"
              >
                <HStack gap={3} minW={0}>
                  <Text fontWeight="bold" minW="3.25rem">
                    #{currentUserEntry.rank}
                  </Text>
                  <Avatar.Root size="sm" shape="full">
                    <Avatar.Fallback name={currentUserEntry.user.display} />
                    <Avatar.Image
                      src={currentUserEntry.user.picture}
                      alt={currentUserEntry.user.display}
                    />
                  </Avatar.Root>
                  <Link
                    asChild
                    color="blue.600"
                    fontWeight="semibold"
                    _hover={{ textDecor: "underline" }}
                  >
                    <NavLink to={`/profile/${currentUserEntry.user.username}`}>
                      {currentUserEntry.user.display}
                    </NavLink>
                  </Link>
                </HStack>
                <Text fontWeight="semibold">{currentUserEntry.points} pts</Text>
              </HStack>
            ) : (
              <Text>You are not currently on the leaderboard.</Text>
            )}
          </Box>
        </VStack>
      </Box>
    </Flex>
  );
}
