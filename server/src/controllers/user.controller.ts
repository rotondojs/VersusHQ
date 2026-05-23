import {
  type SafeUserInfo,
  withAuth,
  zUserAuth,
  zUserOauthSignup,
  zUserUpdateRequest,
} from "@gamenite/shared";
import {
  createOAuthUser,
  createUser,
  getAllUsers,
  getUsersByUsername,
  populateSafeUserInfo,
  updateUser,
  uploadUserPicture,
} from "../services/user.service.ts";
import { type RestAPI } from "../types.ts";
import { z } from "zod";
import { checkAuth, getUserByUsername } from "../services/auth.service.ts";
import { ImageRepo } from "../repository.ts";

/**
 * Handles user login by validating password-based or Google-backed credentials.
 * @param req The request containing a `UserAuth` payload in the body.
 * @param res The response, either returning the user or an error.
 */
export const postLogin: RestAPI<SafeUserInfo> = async (req, res) => {
  const userAuth = zUserAuth.safeParse(req.body);
  if (!userAuth.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(userAuth.data);
  if (!user) {
    res.send({ error: "Invalid username or password" });
    return;
  }
  res.send(await populateSafeUserInfo(user.userId));
};

/**
 * Update a user's information
 * @param req A request containing authenticated profile-field updates
 * @param res The response, either returning the updated user or an error
 */
export const postByUsername: RestAPI<SafeUserInfo, { username: string }> = async (req, res) => {
  const body = withAuth(zUserUpdateRequest).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user || user.username !== req.params.username) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  res.send(await updateUser(req.params.username, body.data.payload));
};

const zUserPictureUpload = z.object({
  auth: zUserAuth,
  pictureDataUrl: z.string(),
});

/**
 * Uploads a new profile picture for a user and updates their stored picture URL.
 */
export const postPicture: RestAPI<SafeUserInfo, { username: string }> = async (req, res) => {
  const result = zUserPictureUpload.safeParse(req.body);
  if (!result.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const { auth, pictureDataUrl } = result.data;
  const user = await checkAuth(auth);
  if (!user || user.username !== req.params.username) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  // Expect a data URL in the form "data:<mime>;base64,<data>"
  const match = pictureDataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    res.status(400).send({ error: "Invalid picture data" });
    return;
  }

  const mimeType = match[1];
  const base64Data = match[2];

  try {
    res.send(await uploadUserPicture(user.username, mimeType, base64Data));
  } catch {
    res.status(500).send({ error: "Failed to store profile picture" });
  }
};

/**
 * Serves a stored profile picture by its ID.
 */
export const getPicture: RestAPI<
  void,
  { username: string; pictureId: string },
  Buffer | { error: string }
> = async (req, res) => {
  const pictureId = req.params.pictureId;
  try {
    const { base64Data, mimeType } = await ImageRepo.get(pictureId);
    const buffer = Buffer.from(base64Data, "base64");
    res.type(mimeType).send(buffer);
  } catch {
    res.status(404).send({ error: "Picture not found" });
  }
};

/**
 * Handles the creation of a new user account.
 * @param req The request containing username and password in the body.
 * @param res The response, either returning the created user or an error.
 * @returns A promise resolving to void.
 */
export const postSignup: RestAPI<SafeUserInfo> = async (req, res) => {
  const userAuth = zUserAuth.safeParse(req.body);
  if (!userAuth.success || !userAuth.data.password) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  res.send(await createUser(userAuth.data.username, new Date(), userAuth.data.password));
};

/**
 * Handles the creation of a new user account from a Google OAuth signup payload.
 * @param req The request containing Google identity and profile fields in the body.
 * @param res The response, either returning the created user or an error.
 * @returns A promise resolving to void.
 */
export const postOAuthSignup: RestAPI<SafeUserInfo> = async (req, res) => {
  const userAuth = zUserOauthSignup.safeParse(req.body);
  if (!userAuth.success || !userAuth.data.googleId) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  res.send(
    await createOAuthUser(
      userAuth.data.googleId,
      new Date(),
      userAuth.data.picture,
      userAuth.data.email,
      userAuth.data.name,
    ),
  );
};

/**
 * Retrieves a user by their username.
 * @param req The request containing the username as a route parameter.
 * @param res The response, either returning the user (200) or an error.
 */
export const getByUsername: RestAPI<SafeUserInfo, { username: string }> = async (req, res) => {
  const user = await getUserByUsername(req.params.username);
  if (!user) {
    res.status(404).send({ error: "User not found" });
    return;
  }
  res.send(await populateSafeUserInfo(user.userId));
};

/**
 * Returns the user information for a list of users
 */
export const postList: RestAPI<SafeUserInfo[]> = async (req, res) => {
  const usernames = z.array(z.string()).safeParse(req.body);
  if (!usernames.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  let users: SafeUserInfo[];
  try {
    users = await getUsersByUsername(usernames.data);
  } catch {
    res.send({ error: "Usernames do not all exist" });
    return;
  }

  res.send(users);
};

/**
 * Returns every user in the system as safe profile data.
 */
export const getAll: RestAPI<SafeUserInfo[]> = async (_req, res) => {
  res.send(await getAllUsers());
};
