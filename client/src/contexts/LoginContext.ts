import { type SafeUserInfo } from "@gamenite/shared";
import { createContext } from "react";
import { type GameSocket } from "../util/types.ts";

/**
 * The user information held as part of a login context
 *
 * - user - the current user
 * - pass - the user's password (optional for Google OAuth users)
 * - googleId - the user's googleId (optional for standard password users)
 * - reset - a callback that logs out the user
 */
export interface AuthContext {
  user: SafeUserInfo;
  pass?: string;
  googleId?: string;
  reset: () => void;
}

/**
 * See useLoginContext()
 */
export const LoginContext = createContext<
  | (AuthContext & {
      socket: GameSocket;
    })
  | null
>(null);
