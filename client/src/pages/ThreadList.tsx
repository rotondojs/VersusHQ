import { useNavigate } from "react-router-dom";
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import LoadingSpinner from "../components/LoadingSpinner.tsx";
import ThreadSummaryView from "../components/ThreadSummaryView.tsx";
import useThreadList from "../hooks/useThreadList.ts";

/**
 * Lists forum threads and provides an entry point for creating a new post.
 */
export default function ThreadList() {
  const { threads, isLoading, errorMessage, isEmpty } = useThreadList();
  const navigate = useNavigate();

  return (
    <Box className="content">
      <VStack className="pageShell" align="stretch" gap={5} minH={0}>
        <Box className="pageSurface pageHeader">
          <Text className="pageEyebrow">Community</Text>
          <Box className="pageTitleRow">
            <Box>
              <Heading className="pageTitle">Forum</Heading>
              <Text className="pageIntro">
                Keep conversations going with strategy notes, tournament talk, and quick updates.
              </Text>
            </Box>
            <Button
              onClick={() => navigate("/forum/post/new")}
              bg="var(--accent-primary)"
              color="white"
              _hover={{ bg: "var(--accent-primary-hover)" }}
              borderRadius="full"
              px={6}
            >
              Create New Post
            </Button>
          </Box>
        </Box>

        {isLoading ? (
          <LoadingSpinner label="Loading forum posts..." />
        ) : errorMessage ? (
          <div className="error-message">Error: {errorMessage}</div>
        ) : isEmpty ? (
          <div>No threads found...</div>
        ) : (
          <VStack
            role="list"
            align="stretch"
            gap={3}
            flex={1}
            minH={0}
            maxH="calc(100vh - 19rem)"
            overflowY="auto"
            pr={1}
          >
            {threads.map((thread) => (
              <ThreadSummaryView {...thread} key={thread.threadId.toString()} />
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
