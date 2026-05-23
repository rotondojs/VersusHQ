import { AuthRepo } from "../repository.ts";
import type { UserWithId } from "../types.ts";
import type { UserAuth } from "@gamenite/shared";

/**
 * Retrieves a single user from the database.
 *
 * @param username - The username of the user to find
 * @returns the found user object (without the password) or null
 */
export async function getUserByUsername(username: string): Promise<UserWithId | null> {
  const auth = await AuthRepo.find(username);
  if (!auth) return null;
  return Promise.resolve({ userId: auth.userId, username });
}

/**
 * Create or update the authentication information associated with a specific
 * username
 *
 * @param username
 * @param updateType whether this is a default (password-based) auth update or an OAuth update
 * @param password the new password, if this is a default auth update
 * @param googleId the new googleId, if this is an OAuth update`
 * @param userId the User model connected to this username
 */
export async function updateAuth(
  username: string,
  userId: string,
  updateType: "default" | "oauth",
  password?: string,
  googleId?: string,
) {
  if (updateType === "oauth") {
    if (!googleId) throw new Error("Invalid auth");
    await AuthRepo.set(username, { googleId, userId: userId });
  } else {
    if (!password) throw new Error("Invalid auth");
    await AuthRepo.set(username, { password, userId: userId });
  }
}

/**
 * Takes a username and password, and either returns the corresponding user object
 * (without the password) or null if the username/password combination does not
 * match stored values.
 *
 * @param auth - A user's authentication information (username and password/googleId)
 * @returns the corresponding user object (without the password) or null.
 */
export async function checkAuth({
  username,
  password,
  googleId,
}: UserAuth): Promise<UserWithId | null> {
  const auth = await AuthRepo.find(username);
  if (!auth) return null;
  if (password && auth.password && password === auth.password)
    return Promise.resolve({ username, userId: auth.userId });
  if (googleId && auth.googleId && googleId === auth.googleId)
    return Promise.resolve({ username, userId: auth.userId });
  return null;
}

/**
 * Takes auth credentials and returns the corresponding user or throws when they are invalid.
 *
 * @param auth - A user's authentication information, including password or Google identity data
 * @returns the corresponding user object (without the password)
 * @throws if the auth information is incorrect
 */
export async function enforceAuth(auth: UserAuth): Promise<UserWithId> {
  const user = await checkAuth(auth);
  if (!user) throw new Error("Invalid auth");
  return user;
}
