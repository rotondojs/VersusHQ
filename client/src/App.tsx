/* eslint no-console: "off" */

import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./pages/Login.tsx";
import type { AuthContext } from "./contexts/LoginContext.ts";
import Layout from "./components/Layout.tsx";
import Home from "./pages/Home.tsx";
import ThreadList from "./pages/ThreadList.tsx";
import Profile from "./pages/Profile.tsx";
import { io } from "socket.io-client";
import type { GameSocket } from "./util/types.ts";
import LoggedInRoute from "./components/LoggedInRoute.tsx";
import NewGame from "./pages/NewGame.tsx";
import Game from "./pages/Game.tsx";
import GameList from "./pages/GameList.tsx";
import TournamentList from "./pages/TournamentList.tsx";
import NewTournament from "./pages/NewTournament.tsx";
import TournamentPage from "./pages/TournamentPage.tsx";
import EditTournament from "./pages/EditTournament.tsx";
import ThreadPage from "./pages/ThreadPage.tsx";
import { ErrorBoundary } from "react-error-boundary";
import fallback from "./fallback.tsx";
import NewThread from "./pages/NewThread.tsx";
import TimeContextKeeper from "./components/UpdatingTimeContext.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import ProfileSetup from "./pages/ProfileSetup.tsx";
import Leaderboard from "./pages/Leaderboard.tsx";
import Settings from "./pages/Settings.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** If `true`, all incoming socket messages will be logged */
const DEBUG_SOCKETS = false;
const AUTH_STORAGE_KEY = "gamenite-auth";

type PersistedAuth = Pick<AuthContext, "user" | "pass" | "googleId">;

/**
 * Websocket connection for the app. It would be natural to define this in a
 * useEffect hook, but the React docts advise against this.
 * https://react.dev/learn/you-might-not-need-an-effect#initializing-the-application
 * */
let socket: GameSocket | null = null;
if (typeof window !== "undefined") {
  socket = io();
  if (DEBUG_SOCKETS) {
    socket.onAny((tag, payload) => {
      console.log(`from socket got ${tag}(${JSON.stringify(payload)})`);
    });
  }
}

const queryClient = new QueryClient();
const chakraSystem = createSystem(defaultConfig);

/**
 * Returns a readable fallback message for unmatched routes.
 */
function NoSuchRoute() {
  const { pathname } = useLocation();
  return `No page found for route '${pathname}'`;
}

/**
 * Parses persisted auth state from local storage and rejects malformed data.
 */
function parsePersistedAuth(raw: string): PersistedAuth | null {
  try {
    const parsed = JSON.parse(raw) as PersistedAuth;
    if (!parsed?.user?.username) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Mounts the application providers, restores persisted auth, and defines routes.
 */
export default function App() {
  const [authState, setAuthState] = useState<PersistedAuth | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const persisted = parsePersistedAuth(raw);
    if (!persisted) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return persisted;
  });
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || "";

  const auth: AuthContext | null = authState
    ? { ...authState, reset: () => setAuthState(null) }
    : null;

  /**
   * Persists the authenticated user fields needed to restore a session later.
   */
  const setAuth = (nextAuth: AuthContext | null) => {
    setAuthState(
      nextAuth
        ? {
            user: nextAuth.user,
            pass: nextAuth.pass,
            googleId: nextAuth.googleId,
          }
        : null,
    );
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!authState) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  }, [authState]);

  return (
    socket && (
      <GoogleOAuthProvider clientId={googleClientId}>
        <QueryClientProvider client={queryClient}>
          <ChakraProvider value={chakraSystem}>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login setAuth={setAuth} />} />
                <Route
                  path="/profile-setup/:username"
                  element={
                    <LoggedInRoute auth={auth} socket={socket}>
                      <ProfileSetup />
                    </LoggedInRoute>
                  }
                />
                <Route
                  element={
                    <LoggedInRoute auth={auth} socket={socket}>
                      <ThemeProvider initialTheme={auth?.user.theme}>
                        <TimeContextKeeper updateFrequency={20 * 1000}>
                          <ErrorBoundary fallbackRender={fallback}>
                            <Layout />
                          </ErrorBoundary>
                        </TimeContextKeeper>
                      </ThemeProvider>
                    </LoggedInRoute>
                  }
                >
                  <Route path="/" element={<Home />} />
                  <Route path="/forum" element={<ThreadList />} />
                  <Route path="/forum/post/new" element={<NewThread />} />
                  <Route path="/forum/post/:threadId" element={<ThreadPage />} />
                  <Route path="/games" element={<GameList />} />
                  <Route path="/game/new" element={<NewGame />} />
                  <Route path="/game/:gameId" element={<Game />} />
                  <Route path="/tournaments" element={<TournamentList />} />
                  <Route path="/tournament/new" element={<NewTournament />} />
                  <Route path="/tournament/:tournamentId" element={<TournamentPage />} />
                  <Route path="/tournament/:tournamentId/edit" element={<EditTournament />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile/:username" element={<Profile />} />
                  <Route path="/*" element={<NoSuchRoute />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ChakraProvider>
        </QueryClientProvider>
      </GoogleOAuthProvider>
    )
  );
}
