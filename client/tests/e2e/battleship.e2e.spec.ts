/**
 * End-to-end coverage for human and AI Battleship flows.
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  createFreshUser,
  createGameFromForm,
  logInUser,
  openGameByCreator,
  placeHorizontalFleet,
  placeVerticalFleet,
} from "./testUtils.ts";

let userContext1: BrowserContext;
let userContext2: BrowserContext;
let page1: Page;
let page2: Page;

test.beforeEach(async ({ browser }) => {
  userContext1 = await browser.newContext();
  userContext2 = await browser.newContext();
  page1 = await userContext1.newPage();
  page2 = await userContext2.newPage();
});

test.afterEach(async () => {
  await userContext1.close();
  await userContext2.close();
});

test.describe("The game of Battleship", () => {
  test("supports a human game with hidden ships, scoring, and extra turns on hits", async () => {
    const username1 = await createFreshUser(page1);
    await createGameFromForm(page1, "battleship", "human");

    await expect(page1.getByText("waiting for game to begin")).toBeVisible();

    await logInUser(page2, "user2", "pwd2222");
    await openGameByCreator(page2, username1);
    await page2.getByRole("button", { name: "Join Game" }).click();

    await expect(page1.getByRole("button", { name: "Lock Fleet" })).toBeVisible();
    await expect(page2.getByRole("button", { name: "Lock Fleet" })).toBeVisible();

    await placeHorizontalFleet(page1);
    await placeVerticalFleet(page2);

    await expect(page1.getByText("Current turn:")).toBeVisible();
    await expect(page1.getByLabel("Your grid A1")).toHaveText("C");
    await expect(page2.getByLabel("Your grid A1")).toHaveText("C");
    await expect(page1.getByLabel("Opponent grid A1")).toHaveText("");

    await page1.getByLabel("Opponent grid A1").click();

    await expect(page1.getByLabel("Opponent grid A1")).toHaveText("X");
    await expect(page1.locator(".battleshipScoreboard strong").first()).toHaveText("5");
    await expect(page2.locator(".battleshipScoreboard strong").first()).toHaveText("5");
    await expect(page2.getByText("Waiting for the opponent to finish their turn.")).toBeVisible();

    await page1.getByLabel("Opponent grid H8").click();

    await expect(page1.getByText("Waiting for the opponent to finish their turn.")).toBeVisible();
    await expect(
      page2.getByText("Waiting for the opponent to finish their turn."),
    ).not.toBeVisible();
  });

  test("starts AI games immediately and keeps spectator boards masked", async () => {
    const username1 = await createFreshUser(page1);
    await createGameFromForm(page1, "battleship", "ai");

    await expect(page1.getByText("Player #2 is Battleship AI")).toBeVisible();
    await expect(page1.getByRole("button", { name: "Lock Fleet" })).toBeVisible();

    await logInUser(page2, "user2", "pwd2222");
    await openGameByCreator(page2, username1);

    await expect(
      page2.getByText("Spectators can follow readiness and score, but not ship positions."),
    ).toBeVisible();
    await expect(page2.getByLabel("Player 1 grid A1")).toHaveText("");
    await expect(page2.getByLabel("Player 2 grid A1")).toHaveText("");
    await expect(page2.locator(".battleshipScoreboard strong").first()).toHaveText("0");

    await placeHorizontalFleet(page1);

    const candidateShots = [
      "Opponent grid H8",
      "Opponent grid H7",
      "Opponent grid H6",
      "Opponent grid H5",
      "Opponent grid G8",
      "Opponent grid G7",
      "Opponent grid G6",
      "Opponent grid F8",
      "Opponent grid F7",
      "Opponent grid E8",
    ];

    for (const shot of candidateShots) {
      await page1.getByLabel(shot).click();
      const aiLogs = page1.locator(".chatMoveLog").filter({ hasText: "Battleship AI" });
      try {
        await expect(aiLogs.first()).toBeVisible({ timeout: 500 });
        break;
      } catch {
        // The human kept the turn after a hit, so try another square.
      }
    }

    const aiLogs = page1.locator(".chatMoveLog").filter({ hasText: "Battleship AI" });
    await expect(aiLogs.first()).toBeVisible();
    expect(await aiLogs.count()).toBeGreaterThanOrEqual(1);

    await expect(page2.getByLabel("Player 1 grid A1")).toHaveText("");
    await expect(page2.getByLabel("Player 2 grid A1")).toHaveText("");
  });
});
