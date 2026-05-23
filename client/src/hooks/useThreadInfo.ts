import type { ThreadInfo } from "@gamenite/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { threadInfo } from "../services/threadService.ts";

/**
 * Custom hook to get the information for a single thread and decide on an
 * appropriate message if that information is not available.
 * @param threadId
 * @returns an object containing
 * - `thread`: The requested thread, or a message explaining why it's not there
 * - `setThread`: A callback that can force a reload of the thread's information after adding a comment
 */
export default function useThreadInfo(threadId: string) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["thread", threadId],
    enabled: Boolean(threadId),
    queryFn: async (): Promise<ThreadInfo> => {
      const result = await threadInfo(threadId);
      if ("error" in result) {
        throw new Error(result.error);
      }

      return result;
    },
  });

  const errorMessage =
    error instanceof Error ? error.message : error ? "Unable to load thread right now." : null;

  return {
    threadInfo: data ?? null,
    isLoading,
    errorMessage,
    setThread: (newThread: ThreadInfo) => {
      queryClient.setQueryData(["thread", threadId], newThread);
    },
  };
}
