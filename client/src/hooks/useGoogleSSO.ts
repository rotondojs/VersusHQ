import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useGoogleLogin } from "@react-oauth/google";
import type { AuthContext } from "../contexts/LoginContext";
import axios from "axios";
import { getUserById, loginUser, signupOAuthUser, updateUser } from "../services/userService";
import { useNavigate } from "react-router-dom";
import type { SafeUserInfo } from "@gamenite/shared";

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

/**
 * Manages the Google OAuth login flow and first-time profile setup redirect.
 */
export default function useGoogleSSO(setAuth: (auth: AuthContext | null) => void) {
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  const googleSsoMutation = useMutation({
    mutationFn: async (
      accessToken: string,
    ): Promise<{ user: SafeUserInfo; email: string; googleId: string }> => {
      const response = await axios.get<GoogleUserInfo>(
        `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`,
        {
          headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Authorization: `Bearer ${accessToken}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Accept: "application/json",
          },
        },
      );

      const data = response.data;
      const existingUser = await getUserById(data.email);
      if ("error" in existingUser) {
        const user = await signupOAuthUser({
          googleId: data.id,
          picture: data.picture,
          email: data.email,
          name: data.name,
        });
        if ("error" in user) {
          throw new Error(`Google SSO Sign Up Failed: ${user.error}`);
        }
        return { user, email: data.email, googleId: data.id };
      }

      const user = await loginUser({
        username: data.email,
        googleId: data.id,
      });
      if ("error" in user) {
        throw new Error(`Google SSO Log In Failed: ${user.error}`);
      }

      return { user, email: data.email, googleId: data.id };
    },
    onSuccess: ({ user, email, googleId }) => {
      setAuth({ user, googleId, reset: () => setAuth(null) });
      if (!user.lastLogin) {
        navigate(`/profile-setup/${encodeURIComponent(email)}`);
      } else {
        void updateUser(user, { lastLogin: new Date() });
        navigate("/");
      }
    },
    onError: (caughtError) => {
      setErr(caughtError instanceof Error ? caughtError.message : "Google SSO failed.");
    },
  });

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      setErr(null);
      googleSsoMutation.mutate(codeResponse.access_token);
    },
    onError: (error) => setErr("Login Failed: " + error.error_description),
  });

  return {
    login,
    err,
    isSubmitting: googleSsoMutation.isPending,
  };
}
