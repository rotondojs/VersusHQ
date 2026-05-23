/**
 * Renders a user label or profile link, with special handling for the current user and AI users.
 */
import type { SafeUserInfo } from "@gamenite/shared";
import useLoginContext from "../hooks/useLoginContext";
import { NavLink } from "react-router-dom";

interface UserLinkProps {
  user: SafeUserInfo;
  capitalize?: boolean;
}

/**
 * Renders a profile link, a self-reference, or a plain AI label for a user.
 */
export default function UserLink({ user, capitalize }: UserLinkProps) {
  const loggedInUser = useLoginContext();
  if (user.username === loggedInUser.user.username) {
    return capitalize ? "You" : "you";
  }
  if (user.username.startsWith("__")) {
    return user.display;
  }
  return <NavLink to={`/profile/${user.username}`}>{user.display}</NavLink>;
}
