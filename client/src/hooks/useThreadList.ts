import type { ThreadSummary } from "@gamenite/shared";
import { useQuery } from "@tanstack/react-query";
import { threadList } from "../services/threadService.ts";

interface UseThreadListResult {
  threads: ThreadSummary[];
  isLoading: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
}

/**
 * Custom hook to get the list of all thread summaries
 * @param maxSummaries - the maximum number of summaries desired (default is all of them)
 * @returns A message to display to the user (Loading... or an error message), or a list
 */
export default function useThreadList(maxSummaries?: number): UseThreadListResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["threads"],
    queryFn: async (): Promise<ThreadSummary[]> => {
      const result = await threadList();
      if ("error" in result) {
        throw new Error(result.error);
      }

      return result;
    },
  });

  const threads = maxSummaries ? (data ?? []).slice(0, maxSummaries) : (data ?? []);
  const errorMessage =
    error instanceof Error ? error.message : error ? "Unable to load threads right now." : null;

  return {
    threads,
    isLoading,
    errorMessage,
    isEmpty: !isLoading && !errorMessage && threads.length === 0,
  };
}
