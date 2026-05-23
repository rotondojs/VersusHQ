import useLoginForm from "../hooks/useLoginForm.ts";
import "./Login.css";
import { useState } from "react";
import { type AuthContext } from "../contexts/LoginContext.ts";
import useGoogleSSO from "../hooks/useGoogleSSO";
import { Button, Input, Separator, Text, VStack } from "@chakra-ui/react";

interface LoginProps {
  setAuth: (s: AuthContext | null) => void;
}

/**
 * Authentication screen for logging in, signing up, or entering through Google SSO.
 */
export default function Login({ setAuth }: LoginProps) {
  const { mode, username, password, confirm, err, handleInputChange, handleSubmit, toggleMode } =
    useLoginForm(setAuth);
  const { login, err: googleErr } = useGoogleSSO(setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const fieldStyles = {
    size: "lg" as const,
    borderRadius: "lg",
    borderColor: "blackAlpha.200",
    bg: "whiteAlpha.900",
  };

  return (
    <VStack className="login-page" minH="100vh" justify="center" px={4} py={8} gap={6}>
      <div className="login-shell">
        <div className="login-brand-panel">
          <span className="pageEyebrow">VersusHQ Access</span>
          <h1>
            <span>Compete</span>
            <span className="login-brand-indent-live login-brand-word-live">Live.</span>
            <span>Build</span>
            <span className="login-brand-indent-community login-brand-word-community">
              Community.
            </span>
          </h1>
          <p>
            Join live matches, climb tournament brackets, and stay connected with players in one
            shared arena.
          </p>
          <div className="login-brand-metrics">
            <div>
              <strong>Live</strong>
              <span>Game rooms and chat</span>
            </div>
            <div>
              <strong>Bracketed</strong>
              <span>Tournaments and match flow</span>
            </div>
            <div>
              <strong>Social</strong>
              <span>Forum and spectators</span>
            </div>
          </div>
        </div>

        <VStack className="login-wrapper pageSurface" w="full" maxW="28rem" p={8} gap={5}>
          <img
            src="/favicon.png"
            alt="VersusHQ"
            width={72}
            height={72}
            style={{ borderRadius: "18px" }}
          />
          <Text fontSize="2xl" fontWeight="bold" color="var(--fg-primary)" letterSpacing="tight">
            Welcome to VersusHQ
          </Text>
          <form className="login" style={{ width: "100%" }} onSubmit={(e) => handleSubmit(e)}>
            <VStack w="full" gap={4}>
              <Input
                type="text"
                value={username}
                onChange={(event) => handleInputChange(event, "username")}
                placeholder="Username"
                aria-label="Username"
                _focusVisible={{
                  borderColor: "var(--accent-secondary)",
                  boxShadow: "0 0 0 4px var(--focus-ring)",
                }}
                {...fieldStyles}
              />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => handleInputChange(event, "password")}
                placeholder="Password"
                aria-label="Password"
                _focusVisible={{
                  borderColor: "var(--accent-secondary)",
                  boxShadow: "0 0 0 4px var(--focus-ring)",
                }}
                {...fieldStyles}
              />
              {mode === "signup" && (
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(event) => handleInputChange(event, "confirm")}
                  placeholder="Confirm Password"
                  aria-label="Confirm Password"
                  _focusVisible={{
                    borderColor: "var(--accent-secondary)",
                    boxShadow: "0 0 0 4px var(--focus-ring)",
                  }}
                  {...fieldStyles}
                />
              )}
              <div className="labeled-section">
                <input
                  type="checkbox"
                  id="showPasswordToggle"
                  checked={showPassword}
                  onChange={() => setShowPassword((prevShowPassword) => !prevShowPassword)}
                />
                <label htmlFor="showPasswordToggle">Show Password</label>
              </div>
              {err && <p className="error-message centered">{err}</p>}
              <Button
                type="submit"
                size="lg"
                w="full"
                borderRadius="full"
                bg="var(--accent-primary)"
                color="white"
                _hover={{ bg: "var(--accent-primary-hover)" }}
              >
                {mode === "signup" ? "Sign Up" : "Log In"}
              </Button>
              <Button
                type="button"
                size="lg"
                w="full"
                borderRadius="full"
                bg="white"
                color="var(--accent-primary)"
                borderWidth="1px"
                borderColor="var(--surface-outline)"
                _hover={{ bg: "var(--bg-secondary)" }}
                onClick={(e) => {
                  e.preventDefault();
                  toggleMode();
                }}
              >
                {mode === "signup" ? "Use Existing Account" : "Create New Account"}
              </Button>
            </VStack>
          </form>

          <VStack className="divider-container" w="full" gap={2}>
            <Separator w="full" />
            <span className="divider-text">or</span>
            <Separator w="full" />
          </VStack>

          <Button
            type="button"
            size="lg"
            w="full"
            borderRadius="full"
            bg="var(--surface-strong)"
            color="var(--fg-primary)"
            borderWidth="1px"
            borderColor="var(--surface-outline)"
            _hover={{ bg: "var(--bg-secondary)" }}
            onClick={() => login()}
          >
            Sign in with Google
          </Button>
          {googleErr && <p className="error-message centered">{googleErr}</p>}
        </VStack>
      </div>
    </VStack>
  );
}
