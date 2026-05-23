import { z } from "zod";

/**
 * Represents a username/(password or googleId) pair passed for authentication.
 */
export type UserAuth = z.infer<typeof zUserAuth>;
export const zUserAuth = z
  .object({
    username: z.string(),
    password: z.string().optional(),
    googleId: z.string().optional(),
  })
  .refine((data) => data.password || data.googleId, {
    message: "Either password or googleId must be provided",
    path: ["password", "googleId"],
  });

/**
 * Represents paload for signing in user through Google OAuth.
 */
export type UserOAuthSignUp = z.infer<typeof zUserOauthSignup>;
export const zUserOauthSignup = z.object({
  googleId: z.string(),
  picture: z.string(),
  email: z.string(),
  name: z.string(),
});

/**
 * If `zT` is the zod representation of type `T`, then `withAuth(zT)` is the
 * zod representation of the type `WithAuth<T>` that is used to validate
 * payloads of auth-containing client-to-server requests.
 */
export function withAuth<T extends z.ZodType>(
  zT: T,
): z.ZodObject<{ auth: typeof zUserAuth; payload: T }> {
  return z.object({ auth: zUserAuth, payload: zT });
}

/**
 * The type of client-to-server requests containing auth information as well
 * as a data payload.
 */
export interface WithAuth<T> {
  auth: UserAuth;
  payload: T;
}
