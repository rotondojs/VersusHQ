import { createContext, useContext, useEffect, useState } from "react";
import type { UserAuth } from "@gamenite/shared";
import { updateUser } from "../services/userService";

/**
 * The available UI themes for the application.
 */
export type Theme = "light" | "dark" | "glacier" | "sunset";
export const THEMES: Theme[] = ["light", "dark", "glacier", "sunset"];
export const themeMetadata: Record<Theme, { label: string; description: string }> = {
  light: {
    label: "Light",
    description: "Bright, airy, and clean for everyday play.",
  },
  dark: {
    label: "Dark",
    description: "Deeper contrast with calmer night-mode surfaces.",
  },
  glacier: {
    label: "Glacier",
    description: "Crisp ice-blue tones with cool, focused contrast.",
  },
  sunset: {
    label: "Sunset",
    description: "Warm sand and copper tones with a matchday glow.",
  },
};

/**
 * Normalizes legacy stored theme values into the current supported theme set.
 */
function normalizeTheme(value?: string): Theme {
  switch (value) {
    case "light":
    case "dark":
    case "glacier":
    case "sunset":
      return value;
    case "ocean":
      return "glacier";
    case "forest":
      return "sunset";
    default:
      return "light";
  }
}

/**
 * The value provided by ThemeContext.
 * - `theme`: the currently active theme
 * - `setTheme`: updates the active theme and persists it to the server
 */
interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme, auth: UserAuth) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Provides theme state to the component tree.
 * Applies the active theme as a `data-theme` attribute on `<html>`,
 * which triggers CSS variable overrides defined in main.css.
 *
 * @param initialTheme - The theme stored on the user's account, loaded on login. Defaults to "light" if absent.
 */
export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme?: string;
}) {
  const [theme, setThemeState] = useState<Theme>(() => normalizeTheme(initialTheme));
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  /**
   * Applies a new theme immediately and persists it to the logged-in user's profile.
   */
  const setTheme = async (newTheme: Theme, auth: UserAuth) => {
    setThemeState(newTheme);
    await updateUser(auth, { theme: newTheme });
  };
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

/**
 * Custom hook to access the active theme and theme setter.
 * @throws if used outside a ThemeProvider
 * @returns `theme` - the current theme name, and `setTheme` - persists the new theme to the server and applies it immediately.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
