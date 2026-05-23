import type { KeyboardEvent, MouseEvent } from "react";
import { Avatar, Badge, Box, HStack, Text, VStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import type { ThreadSummary } from "@gamenite/shared";
import useTimeSince from "../hooks/useTimeSince.ts";

/**
 * Summarizes information for a single thread as part of a list of threads
 */
export default function ThreadSummaryView({
  threadId,
  createdBy,
  createdAt,
  title,
  comments,
}: ThreadSummary) {
  const navigate = useNavigate();
  const timeSince = useTimeSince();

  /**
   * Navigates to the full thread page.
   */
  const openThread = () => navigate(`/forum/post/${threadId}`);

  /**
   * Opens the thread unless the user clicked a nested link.
   */
  const handleContainerClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("a")) {
      return;
    }
    openThread();
  };

  /**
   * Supports keyboard activation for the clickable thread card.
   */
  const handleContainerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openThread();
    }
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={handleContainerClick}
      onKeyDown={handleContainerKeyDown}
      borderWidth="1px"
      borderColor="var(--surface-outline)"
      borderRadius="2xl"
      bg="var(--surface-strong)"
      p={5}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        transform: "translateY(-4px)",
        boxShadow: "var(--shadow-soft)",
        borderColor: "var(--border-color)",
      }}
      _focusVisible={{
        outline: "2px solid",
        outlineColor: "var(--accent-secondary)",
        outlineOffset: "2px",
      }}
    >
      <VStack align="stretch" gap={3}>
        <HStack justify="space-between" align="start" gap={3}>
          <Text fontWeight="semibold" fontSize="md" color="var(--fg-primary)" lineClamp={2}>
            {title}
          </Text>
          <Badge
            colorPalette="blue"
            alignSelf="start"
            whiteSpace="nowrap"
            borderRadius="full"
            px={3}
            py={1}
          >
            {comments} {comments === 1 ? "reply" : "replies"}
          </Badge>
        </HStack>

        <HStack justify="space-between" align="center" gap={3}>
          <HStack gap={2}>
            <Avatar.Root size="sm">
              <Avatar.Fallback name={createdBy.display} />
              {createdBy.picture && <Avatar.Image src={createdBy.picture} />}
            </Avatar.Root>
            <VStack align="start" gap={0}>
              <Text fontSize="sm" color="var(--fg-secondary)">
                Posted by
              </Text>
              <Text fontSize="sm" fontWeight="medium" color="var(--fg-primary)">
                {createdBy.display}
              </Text>
            </VStack>
          </HStack>

          <Text fontSize="sm" color="var(--fg-secondary)" whiteSpace="nowrap">
            {timeSince(createdAt)}
          </Text>
        </HStack>
      </VStack>
    </Box>
  );
}
