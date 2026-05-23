import { expect, test } from "@playwright/test";
import { logInUser } from "./testUtils.ts";

test.describe("Leaderboard page", () => {
  test("loads and shows the top players list", async ({ page }) => {
    await logInUser(page, "user0", "pwd0000");
    await page.getByRole("link", { name: /^Leaderboard/ }).click();
    await page.waitForURL("/leaderboard");

    await expect(page.getByRole("heading", { name: "Global Leaderboard" })).toBeVisible();
    await expect(page.getByRole("listitem").first()).toBeVisible();
  });

  test("shows Your Ranking section", async ({ page }) => {
    await logInUser(page, "user0", "pwd0000");
    await page.goto("/leaderboard");

    await expect(page.getByRole("heading", { name: "Your Ranking" })).toBeVisible();
  });

  test("filters by game type without crashing", async ({ page }) => {
    await logInUser(page, "user0", "pwd0000");
    await page.goto("/leaderboard");

    await page.locator("select").nth(1).selectOption("battleship");
    await expect(page.getByRole("heading", { name: "Your Ranking" })).toBeVisible();
  });

  test("filters by limit", async ({ page }) => {
    await logInUser(page, "user0", "pwd0000");
    await page.goto("/leaderboard");

    await page.locator("select").nth(0).selectOption("0");
    await expect(page.getByRole("heading", { name: "Your Ranking" })).toBeVisible();
  });

  test("filters by date range", async ({ page }) => {
    await logInUser(page, "user0", "pwd0000");
    await page.goto("/leaderboard");

    await page.locator("select").nth(2).selectOption("week");
    await expect(page.getByRole("heading", { name: "Your Ranking" })).toBeVisible();
  });
});
