import { expect, test } from "@playwright/test";
import { logInUser } from "./testUtils.ts";

test.describe("Settings page", () => {
  test("is accessible from the nav and changes the theme", async ({ page }) => {
    await logInUser(page, "user0", "pwd0000");
    await page.getByRole("link", { name: /^Settings/ }).click();
    await page.waitForURL("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.getByRole("button", { name: /^Dark/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("restores saved theme on next login", async ({ page, browser }) => {
    await logInUser(page, "user0", "pwd0000");
    await page.goto("/settings");
    await page.getByRole("button", { name: /^Glacier/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "glacier");

    const page2 = await browser.newPage();
    await logInUser(page2, "user0", "pwd0000");
    await expect(page2.locator("html")).toHaveAttribute("data-theme", "glacier");

    await page2.goto("/settings");
    await page2.getByRole("button", { name: /^Light/ }).click();
    await page2.close();
  });
});
