/**
 * Shared Playwright helpers for login flows, game creation, and repeated Battleship setup steps.
 */
import { expect, type Page } from "@playwright/test";

const AUTH_STORAGE_KEY = "gamenite-auth";
const API_BASE = "http://localhost:8000/api";

/**
 * Set the auth token in localStorage and navigate to the home page.
 * This bypasses the login UI to avoid intermittent rendering issues in CI.
 */
async function setAuthAndNavigate(
  page: Page,
  user: Record<string, unknown>,
  password: string,
  destination = "/",
) {
  const authJson = JSON.stringify({ user, pass: password });
  await page.goto("/login");
  await page.evaluate(({ json, key }) => window.localStorage.setItem(key, json), {
    json: authJson,
    key: AUTH_STORAGE_KEY,
  });
  await page.goto(destination);
  await page.waitForFunction((k) => window.localStorage.getItem(k) !== null, AUTH_STORAGE_KEY);
}

/**
 * Log a user in with a username and password, and wait for successful
 * post-login redirect to the home page
 *
 * @param page
 * @param username
 * @param password
 */
export async function logInUser(page: Page, username: string, password: string) {
  const resp = await page.request.post(`${API_BASE}/user/login`, {
    data: { username, password },
  });
  const user = (await resp.json()) as Record<string, unknown>;
  await setAuthAndNavigate(page, user, password, "/");
  await page.waitForURL("/");
}

/**
 * Create a brand-new user and complete profile setup.
 */
export async function createFreshUser(page: Page): Promise<string> {
  const username = "user" + Math.floor(Math.random() * 2_000_000);
  const password = "pwd_for_" + username;

  const resp = await page.request.post(`${API_BASE}/user/signup`, {
    data: { username, password },
  });
  const user = (await resp.json()) as Record<string, unknown>;
  await setAuthAndNavigate(page, user, password, `/profile-setup/${username}`);
  await page.waitForURL(`/profile-setup/${username}`);

  return username;
}

/**
 * Create a game from the new-game form, optionally choosing a battleship opponent type.
 */
export async function createGameFromForm(
  page: Page,
  gameId: string,
  opponentType?: "human" | "ai",
) {
  await page.goto("/games");
  await page.getByRole("button", { name: "Create New Game" }).click();
  await page.waitForURL("/game/new");
  await page.getByLabel("Game selection").selectOption(gameId);
  if (opponentType) {
    await page.getByLabel("Opponent selection").selectOption(opponentType);
  }
  await page.getByRole("button", { name: "Create New Game" }).click();
}

/**
 * Open the listed game created by the provided user.
 */
export async function openGameByCreator(page: Page, creatorName: string) {
  await page.goto("/games");
  await expect(page.getByRole("listitem").filter({ hasText: creatorName })).toHaveCount(1);
  await page.getByRole("listitem").filter({ hasText: creatorName }).click();
}

/**
 * Place the standard horizontal fleet used in tests.
 */
export async function placeHorizontalFleet(page: Page) {
  for (const cell of [
    "Your grid A1",
    "Your grid B1",
    "Your grid C1",
    "Your grid D1",
    "Your grid E1",
  ]) {
    const locator = page.getByLabel(cell);
    await locator.scrollIntoViewIfNeeded();
    await locator.click({ force: true });
  }
  await page.getByRole("button", { name: "Lock Fleet" }).click();
}

/**
 * Place the standard vertical fleet used in tests.
 */
export async function placeVerticalFleet(page: Page) {
  await page.getByRole("button", { name: "Vertical" }).click();
  for (const cell of [
    "Your grid A1",
    "Your grid A2",
    "Your grid A3",
    "Your grid A4",
    "Your grid A5",
  ]) {
    const locator = page.getByLabel(cell);
    await locator.scrollIntoViewIfNeeded();
    await locator.click({ force: true });
  }
  await page.getByRole("button", { name: "Lock Fleet" }).click();
}

/**
 * Set up a test of two users joining and starting a 2+ player game
 *
 * @param page1 - A Page where we will attempt to create a *new* user. That user will initiate the game.
 * @param page2 - A Page where the preexisting user2 will log in
 * @param gameId - The game id shared by the frontend and backend
 * @param gameStartsAutomatically - true if the game has a maximum of two players
 * @param doAssess - `true` adds extra expectations
 * @returns
 */
export async function createAndLoadGame(
  page1: Page,
  page2: Page,
  gameId: string,
  gameStartsAutomatically: boolean,
  doAssess: boolean,
) {
  // Create a random new user and username to give this test unique identity
  const username1 = "user" + Math.floor(Math.random() * 2_000_000);
  const password1 = "pwd_for_" + username1;
  const username2 = "user2";
  const password2 = "pwd2222";

  // Create user1 via API and set auth in localStorage (avoids fragile UI signup flow in CI)
  const resp1 = await page1.request.post(`${API_BASE}/user/signup`, {
    data: { username: username1, password: password1 },
  });
  const user1 = (await resp1.json()) as Record<string, unknown>;
  await setAuthAndNavigate(page1, user1, password1, "/games");

  // User 1 creates a new game
  await page1.getByRole("button", { name: "Create New Game" }).click();
  await page1.waitForURL("/game/new");
  await page1.getByLabel("Game selection").selectOption(gameId);
  await page1.getByRole("button", { name: "Create New Game" }).click();

  // Causes Playwright to auto-wait for for game to be enabled
  await page1.getByPlaceholder("Send a message to chat").click();

  if (doAssess) {
    await expect(page1.getByText("you are player #1")).toBeVisible();

    // This is the only expectation that insists the game cannot start with one player
    await expect(page1.getByRole("button", { name: "Start Game" })).not.toBeVisible();
  }

  // Log in user2
  await logInUser(page2, username2, password2);

  await page2.goto("/games");

  // The always-on expectation here gives the page a chance to load
  await expect(page2.getByRole("listitem").filter({ hasText: username1 })).toHaveCount(1);

  if (doAssess) {
    await expect(page2.getByRole("listitem").filter({ hasText: username1 })).toHaveCount(1);
  }

  await page2.getByRole("listitem").filter({ hasText: username1 }).click();

  if (doAssess) {
    await expect(page1.getByText("waiting for game to begin")).toBeVisible();
    await expect(page2.getByText("waiting for game to begin")).toBeVisible();
  }

  await page2.getByRole("button", { name: "Join Game" }).click();

  if (doAssess) {
    await expect(page1.getByText("you are player #1")).toBeVisible();
    await expect(page2.getByText("you are player #2")).toBeVisible();

    // React's strict mode causes chat to be joined twice
    // https://react.dev/reference/react/StrictMode
    // To avoid flakiness, we merely require the entered-chat message to appear >= 1 time
    expect(await page1.getByText("Sénior Dos entered chat").count()).toBeGreaterThanOrEqual(1);
  }

  if (gameStartsAutomatically) {
    if (doAssess) {
      await expect(page1.getByRole("button", { name: "Start Game" })).not.toBeVisible();
      await expect(page2.getByRole("button", { name: "Start Game" })).not.toBeVisible();
    }
  } else {
    if (doAssess) {
      await expect(page1.getByRole("button", { name: "Start Game" })).toBeVisible();
      await expect(page2.getByRole("button", { name: "Start Game" })).toBeVisible();
    }

    await page1.getByRole("button", { name: "Start Game" }).click();
  }

  if (doAssess) {
    await expect(page1.getByText("waiting for game to begin")).not.toBeVisible();
    await expect(page2.getByText("waiting for game to begin")).not.toBeVisible();
  }

  return username1;
}
