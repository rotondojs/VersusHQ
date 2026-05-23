import { type ChangeEvent, type SubmitEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import useAuth from "./useAuth.ts";
import { addCommentToThread } from "../services/threadService.ts";
import type { ThreadInfo } from "@gamenite/shared";

/**
 * Custom hook to manage comment creation form logic
 * @param threadId - id of the thread to add a comment to
 * @param firstPost - are there other known posts? (used for validation)
 * @param setThread - callback to update the parent page if thread is updated
 * @returns an object containing
 *  - Form value `comment`
 *  - Possibly-null error message `err`
 *  - Form handlers `handleInputChange` and `handleSubmit`
 */
export default function useNewCommentForm(
  threadId: string,
  firstPost: boolean,
  setThread: (thread: ThreadInfo) => void,
) {
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const auth = useAuth();
  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      const newThread = await addCommentToThread(auth, threadId, text);
      if ("error" in newThread) {
        throw new Error(newThread.error);
      }
      return newThread;
    },
    onSuccess: (newThread) => {
      setErr(null);
      setThread(newThread);
      setComment("");
    },
  });

  /**
   * Updates the draft comment text.
   */
  function handleInputChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setComment(e.target.value);
  }

  /**
   * Validates and submits a new forum comment.
   */
  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (comment.trim() === "") {
      setErr("Please put some text in the comment");
      return;
    }

    if (
      firstPost &&
      comment.trim().toLocaleLowerCase().startsWith("first") &&
      comment.length < 15
    ) {
      setErr("Please put some effort into the comment");
      return;
    }

    try {
      await addCommentMutation.mutateAsync(comment);
    } catch (caughtError) {
      setErr(
        caughtError instanceof Error ? caughtError.message : "Unable to post comment right now.",
      );
    }
  }

  return {
    comment,
    err,
    isSubmitting: addCommentMutation.isPending,
    handleInputChange,
    handleSubmit,
  };
}
