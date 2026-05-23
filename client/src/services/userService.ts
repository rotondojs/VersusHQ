import type { APIResponse } from "../util/types.ts";
import { api, exceptionToErrorMsg } from "./api.ts";
import type {
  ErrorMsg,
  SafeUserInfo,
  UserAuth,
  UserOAuthSignUp,
  UserUpdateRequest,
} from "@gamenite/shared";

const USER_API_URL = `/api/user`;

/**
 * Sends a POST request to authenticate a user.
 */
export const loginUser = async (auth: UserAuth): APIResponse<SafeUserInfo> => {
  try {
    const res = await api.post<SafeUserInfo | ErrorMsg>(`${USER_API_URL}/login`, auth);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a POST request to update parts of a user's profile
 */
export const updateUser = async (
  auth: UserAuth,
  updates: UserUpdateRequest,
): APIResponse<SafeUserInfo> => {
  try {
    const res = await api.post<SafeUserInfo | ErrorMsg>(`${USER_API_URL}/${auth.username}`, {
      auth,
      payload: updates,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Uploads a profile picture for a user.
 *
 * The server stores the image in its datastore and returns an updated user
 * record with a picture URL that can be used by the client.
 */
export const uploadUserPicture = async (
  auth: UserAuth,
  pictureDataUrl: string,
): APIResponse<SafeUserInfo> => {
  try {
    const res = await api.post<SafeUserInfo | ErrorMsg>(
      `${USER_API_URL}/${auth.username}/picture`,
      {
        auth,
        pictureDataUrl,
      },
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a POST request to create a user
 *
 * @param user - The username and password for the account being created.
 * @returns The authenticated user object, or an error message.
 */
export const signupUser = async (user: UserAuth): APIResponse<SafeUserInfo> => {
  try {
    const res = await api.post<SafeUserInfo | ErrorMsg>(`${USER_API_URL}/signup`, user);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a POST request to create a user using Google OAuth credentials
 *
 * @param user - The Google OAuth signup payload, including identity and profile fields.
 * @returns The authenticated user object, or an error message.
 */
export const signupOAuthUser = async (user: UserOAuthSignUp): APIResponse<SafeUserInfo> => {
  try {
    const res = await api.post<SafeUserInfo | ErrorMsg>(`${USER_API_URL}/signup-oauth`, user);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a GET request for a user's data
 *
 * @param username - The username
 * @returns The user's information, or an error message.
 */
export const getUserById = async (username: string): APIResponse<SafeUserInfo> => {
  try {
    const res = await api.get<SafeUserInfo | ErrorMsg>(`${USER_API_URL}/${username}`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a GET request for the full user list.
 */
export const getUsers = async (): APIResponse<SafeUserInfo[]> => {
  try {
    const res = await api.get<SafeUserInfo[] | ErrorMsg>(`${USER_API_URL}/list`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};
