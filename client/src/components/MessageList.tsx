import "./MessageList.css";
import useLoginContext from "../hooks/useLoginContext.ts";
import type { ChatMessage } from "../util/types.ts";
import { useEffect, useRef } from "react";
import useTimeSince from "../hooks/useTimeSince.ts";
import UserLink from "./UserLink.tsx";
import type { TournamentChatRole } from "../util/tournamentChat.ts";

interface MessageListProps {
  messages: ChatMessage[];
  resolveBubbleRole?: (username: string) => TournamentChatRole;
}

/**
 * Renders chat history, including normal messages, meta events, and move logs.
 */
export default function MessageList({ messages, resolveBubbleRole }: MessageListProps) {
  const { user } = useLoginContext();
  const chatWindowRef = useRef<HTMLDivElement | null>(null);
  const timeSince = useTimeSince();
  useEffect(() => {
    if (!chatWindowRef.current) return;
    chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="chatWindow" ref={chatWindowRef}>
      <div className="chatScroller">
        {messages.map((message) => {
          if ("meta" in message) {
            if (message.meta === "move") {
              return (
                <div key={message.messageId} className="chatMoveLog">
                  <UserLink user={message.user} />
                  {message.moveDescription}
                </div>
              );
            }
            return (
              <div key={message.messageId} className="chatMeta">
                <UserLink user={message.user} /> {message.meta}
                {" chat "}
                {timeSince(message.dateTime)}
              </div>
            );
          }
          const bubbleRole = resolveBubbleRole?.(message.createdBy.username);
          const roleClass = bubbleRole ? `chatRole-${bubbleRole}` : "";
          if (user.username === message.createdBy.username) {
            return (
              <div
                key={message.messageId}
                className={`chatMessage chatMe ${roleClass}`.trim()}
                data-chat-role={bubbleRole}
              >
                <div className="chatSender">{timeSince(message.createdAt)}</div>
                <div className="chatContent">{message.text}</div>
              </div>
            );
          }
          return (
            <div
              key={message.messageId}
              className={`chatMessage chatOther ${roleClass}`.trim()}
              data-chat-role={bubbleRole}
            >
              <div className="chatSender">
                <UserLink user={message.createdBy} /> {timeSince(message.createdAt)}
              </div>
              <div className="chatContent">{message.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
