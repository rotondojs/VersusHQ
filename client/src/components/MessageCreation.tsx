import "./MessageCreation.css";
import { type SubmitEvent, type KeyboardEvent, useState } from "react";

interface MessageCreationProps {
  handleMessageCreation: (text: string) => void;
}

/**
 * Renders the chat composer used to submit new messages.
 */
export default function MessageCreation({ handleMessageCreation }: MessageCreationProps) {
  const [text, setText] = useState<string>("");

  /**
   * Sends the current draft when the user presses Enter without Shift.
   */
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.code === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Don't edit text
      handleMessageCreation(text);
      setText("");
    }
  }

  /**
   * Submits the current draft through the form button.
   */
  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    handleMessageCreation(text);
    setText("");
  }

  return (
    <form data-testid="message-creation-form" className="messageCreation" onSubmit={handleSubmit}>
      <textarea
        placeholder="Send a message to chat"
        value={text}
        onKeyDown={handleKeyDown}
        onChange={(e) => setText(e.target.value)}
      ></textarea>
      <button className="messageSendButton secondary" type="submit">
        Send
      </button>
    </form>
  );
}
