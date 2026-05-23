import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useLoginContext from "./useLoginContext.ts";
import type {
  ChatInfo,
  ChatMoveLogPayload,
  ChatNewMessagePayload,
  ChatUserJoinedPayload,
} from "@gamenite/shared";
import type { ChatMessage } from "../util/types.ts";
import useAuth from "./useAuth.ts";

/**
 * Extracts a comparable timestamp from any chat message variant.
 */
function messageTime(msg: ChatMessage): number {
  const date = "createdAt" in msg ? msg.createdAt : msg.dateTime;
  // TypeScript claims `date` is type `Date`, but this isn't always accurate:
  // `createdAt` times that are sent via JSON are turned into strings. Here
  // we use a slightly hacky fix to ensure we'll get a correct date.
  if (typeof date === "string") return new Date(date).getTime();
  return date.getTime();
}

/**
 * Merge two chronologically-sorted ChatMessage arrays into one sorted array.
 */
function mergeByTime(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const result: ChatMessage[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (messageTime(a[i]) <= messageTime(b[j])) {
      result.push(a[i++]);
    } else {
      result.push(b[j++]);
    }
  }
  while (i < a.length) result.push(a[i++]);
  while (j < b.length) result.push(b[j++]);
  return result;
}

/**
 * Custom hook to manage the socket connection for a chat.
 * @throws if outside a LoginContext
 * @returns an object containing
 * - `messages`: The current list of messages in the chat, including
 *   move log entries interleaved chronologically.
 * - `handleMessageCreation`: Sends a new message to the chat
 */

export default function useSocketsForChat(chatId: string) {
  const auth = useAuth();
  const { user, socket } = useLoginContext();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["socket", "chat", chatId] as const, [chatId]);
  const [isJoined, setIsJoined] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey,
    enabled: Boolean(chatId),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    queryFn: () =>
      new Promise<ChatMessage[]>((resolve) => {
        /**
         * Hydrates the initial chat payload and merges move log entries into the timeline.
         */
        const handleChatJoined = (chat: ChatInfo) => {
          if (chat.chatId !== chatId) return;
          socket.off("chatJoined", handleChatJoined);

          const chatMessages: ChatMessage[] = chat.messages;
          const moveLogMessages: ChatMessage[] = chat.moveLog.map((entry, index) => ({
            messageId: `movelog-init-${index}`,
            meta: "move" as const,
            moveDescription: entry.moveDescription,
            user: entry.user,
            dateTime: new Date(entry.createdAt),
          }));

          const allMessages = mergeByTime(chatMessages, moveLogMessages);
          setIsJoined(true);
          resolve([
            ...allMessages,
            { messageId: `meta${Math.random()}`, meta: "entered", user, dateTime: new Date() },
          ]);
        };

        socket.on("chatJoined", handleChatJoined);
        socket.emit("chatJoin", { auth, payload: chatId });
      }),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (text: string) =>
      Promise.resolve(socket.emit("chatSendMessage", { auth, payload: { chatId, text } })),
  });

  useEffect(() => {
    /**
     * Appends an incoming normal chat message to the local cache.
     */
    const handleNewMessage = (payload: ChatNewMessagePayload) => {
      if (payload.chatId === chatId) {
        queryClient.setQueryData<ChatMessage[] | undefined>(queryKey, (oldMessages) => {
          if (!oldMessages) return undefined;
          return [...oldMessages, payload.message];
        });
      }
    };

    /**
     * Appends a synthetic join notice when another user enters the chat.
     */
    const handleUserJoined = (payload: ChatUserJoinedPayload) => {
      if (payload.chatId === chatId)
        queryClient.setQueryData<ChatMessage[] | undefined>(queryKey, (oldMessages) => {
          if (!oldMessages) return undefined;
          return [
            ...oldMessages,
            {
              messageId: `meta${Math.random()}`,
              meta: "entered",
              user: payload.user,
              dateTime: new Date(),
            },
          ];
        });
    };

    /**
     * Appends a move-log entry emitted by a game tied to this chat.
     */
    const handleMoveLog = (payload: ChatMoveLogPayload) => {
      if (payload.chatId === chatId) {
        queryClient.setQueryData<ChatMessage[] | undefined>(queryKey, (oldMessages) => {
          if (!oldMessages) return undefined;
          return [
            ...oldMessages,
            {
              messageId: `movelog-${Date.now()}-${Math.random()}`,
              meta: "move",
              moveDescription: payload.moveDescription,
              user: payload.user,
              dateTime: new Date(payload.createdAt),
            },
          ];
        });
      }
    };

    socket.on("chatNewMessage", handleNewMessage);
    socket.on("chatUserJoined", handleUserJoined);
    socket.on("chatMoveLog", handleMoveLog);

    return () => {
      socket.off("chatNewMessage", handleNewMessage);
      socket.off("chatUserJoined", handleUserJoined);
      socket.off("chatMoveLog", handleMoveLog);
      if (isJoined) {
        socket.emit("chatLeave", { auth, payload: chatId });
      }
    };
  }, [auth, chatId, isJoined, queryClient, queryKey, socket]);

  /**
   * Sends a new chat message through the socket mutation.
   */
  function handleMessageCreation(text: string) {
    sendMessageMutation.mutate(text);
  }

  const errorMessage =
    error instanceof Error ? error.message : error ? "Unable to join chat right now." : null;

  return {
    messages: data ?? null,
    isLoading,
    errorMessage,
    isSendingMessage: sendMessageMutation.isPending,
    handleMessageCreation,
  };
}
