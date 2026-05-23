import { expect, test } from "@playwright/test";
import { logInUser } from "./testUtils.ts";

test.describe("Profile page", () => {
  test("shows stats summary bar", async ({ page }) => {
    await logInUser(page, "user0", "pwd0000");
    await page.goto("/profile/user1");

    await expect(page.locator(".profileStatsSummary")).toBeVisible();
    await expect(page.locator(".profileStatLabel", { hasText: "Played" })).toBeVisible();
    await expect(page.locator(".profileStatLabel", { hasText: "Wins" })).toBeVisible();
    await expect(page.locator(".profileStatLabel", { hasText: "Win Rate" })).toBeVisible();
    await expect(page.locator(".profileStatLabel", { hasText: "Best Place" })).toBeVisible();
    await expect(page.locator(".profileStatLabel", { hasText: "Avg Place" })).toBeVisible();
    await expect(page.locator(".profileStatLabel", { hasText: "Hosted" })).toBeVisible();
  });

  test("shows both charts", async ({ page }) => {
    await logInUser(page, "user0", "pwd0000");
    await page.goto("/profile/user1");

    await expect(page.getByRole("heading", { name: "Tournament Placements" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Points Over Time" })).toBeVisible();
  });

  test("shows tournament history panel", async ({ page }) => {
    await logInUser(page, "user0", "pwd0000");
    await page.goto("/profile/user1");

    await expect(page.getByRole("heading", { name: "Tournament History" })).toBeVisible();
  });
});
