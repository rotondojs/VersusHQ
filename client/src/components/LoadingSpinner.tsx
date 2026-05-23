import { Flex, Spinner, Text, VStack } from "@chakra-ui/react";

interface LoadingSpinnerProps {
  label?: string;
}

/**
 * Displays a centered loading indicator with an optional label.
 */
export default function LoadingSpinner({ label }: LoadingSpinnerProps) {
  return (
    <Flex justify="center" align="center" minH="60vh" px={4}>
      <VStack
        gap={4}
        className="pageSurface"
        px={{ base: 6, md: 8 }}
        py={{ base: 8, md: 10 }}
        textAlign="center"
      >
        <Spinner size="xl" color="var(--accent-primary)" borderWidth="4px" />
        {label && <Text color="var(--fg-secondary)">{label}</Text>}
      </VStack>
    </Flex>
  );
}
