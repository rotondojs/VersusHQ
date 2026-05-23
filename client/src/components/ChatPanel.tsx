import "./ChatPanel.css";
import LoadingSpinner from "./LoadingSpinner.tsx";
import MessageCreation from "./MessageCreation.tsx";
import MessageList from "./MessageList.tsx";
import useSocketsForChat from "../hooks/useSocketsForChat.ts";
import type { TournamentChatRole } from "../util/tournamentChat.ts";

interface ChatProps {
  chatId: string;
  resolveBubbleRole?: (username: string) => TournamentChatRole;
}

/**
 * A chat panel allows viewing and updating messages in live chat
 */
export default function ChatPanel({ chatId, resolveBubbleRole }: ChatProps) {
  const { messages, isLoading, errorMessage, handleMessageCreation } = useSocketsForChat(chatId);

  if (isLoading) {
    return <LoadingSpinner label="Loading chat..." />;
  }

  if (errorMessage) {
    return <div className="error-message">Error: {errorMessage}</div>;
  }

  if (!messages) {
    return null;
  }

  return (
    <div className="chatContainer">
      <MessageList messages={messages} resolveBubbleRole={resolveBubbleRole} />
      <MessageCreation handleMessageCreation={handleMessageCreation} />
    </div>
  );
}
