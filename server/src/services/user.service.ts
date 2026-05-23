/**
 * User profile helpers, including safe serialization and synthetic Battleship AI identities.
 */
import { type SafeUserInfo, type UserUpdateRequest } from "@gamenite/shared";
import { getUserByUsername, updateAuth } from "./auth.service.ts";
import { ImageRepo, UserRepo, TournamentRepo } from "../repository.ts";
import { battleshipAiUserInfo, isBattleshipAiUserId } from "../games/battleshipAIUser.ts";

const disallowedUsernames = new Set(["login", "signup", "list", "signup-oauth"]);

/**
 * Retrieves a single user from the database.
 *
 * @param userId - Valid user id.
 * @returns the found user object (without the password).
 */
export async function populateSafeUserInfo(userId: string): Promise<SafeUserInfo> {
  if (isBattleshipAiUserId(userId)) {
    return Promise.resolve(battleshipAiUserInfo);
  }
  const record = await UserRepo.get(userId);
  if (!record) throw new Error(`No user with id ${userId}`);
  const tournaments = await Promise.all(
    (record.tournamentIds ?? []).map(async (tournamentId) => {
      const t = await TournamentRepo.get(tournamentId);
      return {
        tournamentId,
        name: t.title,
        gameType: t.resolvedGameMode ?? t.requestedGameMode,
        createdAt: new Date(t.creationTime),
        placement: t.placements ? (t.placements[userId] ?? -1) : -1,
        participantCount: t.participants?.length ?? 0,
        hosted: t.hostUserId === userId,
      };
    }),
  );
  const bio = typeof record.bio === "string" ? record.bio : undefined;

  return Promise.resolve({
    username: record.username,
    display: record.display,
    points: record.points ?? 0,
    createdAt: new Date(record.createdAt),
    email: record.email,
    picture: record.picture,
    name: record.name,
    bio,
    theme: record.theme,
    lastLogin: record.lastLogin ? new Date(record.lastLogin) : undefined,
    tournaments,
  });
}

/**
 * Create and store a new user
 *
 * @param newUser - The user object to be saved, containing user details like username, password, etc.
 * @returns Resolves with the saved user object (without the password) or an error message.
 */
export async function createUser(
  username: string,
  createdAt: Date,
  password: string,
): Promise<SafeUserInfo | { error: string }> {
  if ((await getUserByUsername(username)) !== null) {
    return { error: "User already exists" };
  }
  if (disallowedUsernames.has(username)) {
    return { error: "That is not a permitted username" };
  }
  const id = await UserRepo.add({
    username,
    createdAt: createdAt.toISOString(),
    display: username,
    points: 0,
    tournamentIds: [],
  });
  await updateAuth(username, id, "default", password);
  return Promise.resolve({
    username,
    createdAt,
    display: username,
    points: 0,
  });
}

/**
 * Create and store a new user created from Google OAuth credentials
 *
 * @param googleId - The Google account identifier for the new user.
 * @param createdAt - The timestamp for when the account is created.
 * @param picture - The initial Google profile picture URL.
 * @param email - The email address used as the username for the new account.
 * @param name - The display name provided by Google.
 * @returns Resolves with the saved user object (without the password) or an error message.
 */
export async function createOAuthUser(
  googleId: string,
  createdAt: Date,
  picture: string,
  email: string,
  name: string,
): Promise<SafeUserInfo | { error: string }> {
  if ((await getUserByUsername(email)) !== null) {
    return { error: "This email is already being used by another account!" };
  }

  const id = await UserRepo.add({
    username: email,
    createdAt: createdAt.toISOString(),
    display: name,
    points: 0,
    picture: picture,
    email: email,
    name: name,
    tournamentIds: [],
  });
  await updateAuth(email, id, "oauth", undefined, googleId);
  return Promise.resolve({
    username: email,
    createdAt,
    display: name,
    points: 0,
    picture: picture,
    email: email,
    name: name,
  });
}

/**
 * Retrieves a list of usernames from the database
 *
 * @param usernames - A list of usernames
 * @returns the SafeUserInfo objects corresponding to those users
 * @throws if any of the usernames are not valid
 */
export async function getUsersByUsername(usernames: string[]): Promise<SafeUserInfo[]> {
  return Promise.all(
    usernames.map(async (username) => {
      const user = await getUserByUsername(username);
      if (user === null) {
        throw new Error(`No user ${username}`);
      }
      return populateSafeUserInfo(user.userId);
    }),
  );
}

/**
 * Returns every user in the datastore as safe profile data.
 */
export async function getAllUsers(): Promise<SafeUserInfo[]> {
  const userIds = await UserRepo.getAllKeys();
  const users = await Promise.all(userIds.map(populateSafeUserInfo));
  return users.toSorted((left, right) => left.username.localeCompare(right.username));
}

/**
 * Updates user information in the database
 *
 * @param username - A valid username for the user to update
 * @param updates - An object that defines the fields to be updated and their new values
 * @returns the updated user object (without the password)
 * @throws if the username does not exist in the database
 */
export async function updateUser(
  username: string,
  { display, password, email, picture, name, bio, lastLogin, theme }: UserUpdateRequest,
): Promise<SafeUserInfo> {
  const user = await getUserByUsername(username);
  if (!user) throw new Error(`No user ${username}`);
  if (password !== undefined) await updateAuth(username, user.userId, "default", password);
  const newUser = await UserRepo.get(user.userId);
  if (display !== undefined) newUser.display = display;
  if (email !== undefined) newUser.email = email;
  if (picture !== undefined) newUser.picture = picture;
  if (name !== undefined) newUser.name = name;
  if (bio !== undefined) newUser.bio = bio;
  if (lastLogin !== undefined) newUser.lastLogin = lastLogin.toISOString();
  if (theme !== undefined) newUser.theme = theme;
  await UserRepo.set(user.userId, newUser);
  return populateSafeUserInfo(user.userId);
}

/**
 * Stores an uploaded image in the database and updates the associated user's
 * profile to point at the newly stored image.
 *
 * @param username The user uploading the image
 * @param mimeType The MIME type of the image (e.g. "image/png")
 * @param base64Data The raw image data encoded as base64
 * @returns The updated SafeUserInfo (including the picture URL)
 */
export async function uploadUserPicture(
  username: string,
  mimeType: string,
  base64Data: string,
): Promise<SafeUserInfo> {
  const user = await getUserByUsername(username);
  if (!user) throw new Error(`No user ${username}`);

  const imageId = await ImageRepo.add({
    mimeType,
    base64Data,
    createdAt: new Date().toISOString(),
  });

  // Store a URL that users can use to fetch the stored image.
  const pictureUrl = `/api/user/${encodeURIComponent(username)}/picture/${encodeURIComponent(
    imageId,
  )}`;

  const newUser = await UserRepo.get(user.userId);
  newUser.picture = pictureUrl;
  await UserRepo.set(user.userId, newUser);

  return populateSafeUserInfo(user.userId);
}

/**
 * Records that a user is participating in a tournament.
 */
export async function addTournamentToUser(userId: string, tournamentId: string): Promise<void> {
  const record = await UserRepo.get(userId);
  if (!record) throw new Error(`No user with id ${userId}`);
  if (!(record.tournamentIds ?? []).includes(tournamentId)) {
    record.tournamentIds = [...(record.tournamentIds ?? []), tournamentId];
    await UserRepo.set(userId, record);
  }
}

/**
 * Removes a tournament reference from a user's history.
 */
export async function removeTournamentFromUser(
  userId: string,
  tournamentId: string,
): Promise<void> {
  const record = await UserRepo.get(userId);
  if ((record.tournamentIds ?? []).includes(tournamentId)) {
    record.tournamentIds = record.tournamentIds.filter((currentId) => currentId !== tournamentId);
    await UserRepo.set(userId, record);
  }
}

/**
 * Adds leaderboard points to a user after a completed tournament.
 */
export async function incrementUserPoints(userId: string, points: number): Promise<void> {
  const record = await UserRepo.get(userId);
  if (!record) throw new Error(`No user with id ${userId}`);
  record.points = (record.points ?? 0) + points;
  await UserRepo.set(userId, record);
}
