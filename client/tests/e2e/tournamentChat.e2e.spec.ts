import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { logInUser } from "./testUtils.ts";

let hostContext: BrowserContext;
let participantContext: BrowserContext;
let spectatorContext: BrowserContext;
let hostPage: Page;
let participantPage: Page;
let spectatorPage: Page;

function isTournamentDetailUrl(url: URL): boolean {
  return /^\/tournament\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith("/new");
}

function toDateTimeInputValue(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return (
    [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("-") +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

async function createTournament(page: Page, title: string): Promise<string> {
  const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await page.goto("/tournament/new");
  await page.locator("input").first().fill(title);
  await page.locator("textarea").fill("Tournament chat coverage");
  await page.locator("input[type='datetime-local']").fill(toDateTimeInputValue(startTime));
  await page.locator("select").nth(0).selectOption("nim");
  await page.locator("select").nth(1).selectOption("4");
  await page.getByRole("button", { name: "Create Tournament" }).click();
  await page.waitForURL(isTournamentDetailUrl);

  return title;
}

async function openTournamentChat(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: /^Chat$/ })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /^Chat$/ }).click({ force: true });
  await expect(page.getByPlaceholder("Send a message to chat")).toBeVisible();
  await page.waitForTimeout(750);
}

async function openTournamentFromList(page: Page, title: string): Promise<void> {
  await page.goto("/tournaments");
  await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 15000 });
  await page.locator("button", { hasText: title }).first().click();
  await expect(page).toHaveURL(isTournamentDetailUrl);
  await openTournamentChat(page);
}

async function sendMessage(page: Page, text: string): Promise<void> {
  const input = page.getByPlaceholder("Send a message to chat");
  await input.click();
  await input.fill(text);
  await page
    .getByTestId("message-creation-form")
    .evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(input).toHaveValue("");
}

function messageBubble(page: Page, text: string) {
  return page.locator("div[data-chat-role]", { hasText: text }).first();
}

test.beforeEach(async ({ browser }) => {
  hostContext = await browser.newContext();
  participantContext = await browser.newContext();
  spectatorContext = await browser.newContext();
  hostPage = await hostContext.newPage();
  participantPage = await participantContext.newPage();
  spectatorPage = await spectatorContext.newPage();
});

test.afterEach(async () => {
  await hostContext.close();
  await participantContext.close();
  await spectatorContext.close();
});

test.describe("Tournament chat", () => {
  test.describe.configure({ timeout: 120000 });

  test("lets host, participant, and spectator chat with distinct role colors", async () => {
    await logInUser(hostPage, "user0", "pwd0000");
    const tournamentTitle = `Tournament chat ${Date.now()}`;
    await createTournament(hostPage, tournamentTitle);
    await openTournamentChat(hostPage);

    await logInUser(participantPage, "user1", "pwd1111");
    await openTournamentFromList(participantPage, tournamentTitle);
    await participantPage.getByRole("button", { name: "Join Tournament" }).click();
    await expect(participantPage.getByRole("button", { name: "Leave Tournament" })).toBeVisible();

    await logInUser(spectatorPage, "user2", "pwd2222");
    await openTournamentFromList(spectatorPage, tournamentTitle);

    const hostMessage = `Host message ${Date.now()}`;
    const participantMessage = `Participant message ${Date.now()}`;
    const spectatorMessage = `Spectator message ${Date.now()}`;

    await sendMessage(hostPage, hostMessage);
    await sendMessage(participantPage, participantMessage);
    await sendMessage(spectatorPage, spectatorMessage);

    await expect(messageBubble(hostPage, hostMessage)).toHaveAttribute("data-chat-role", "host");
    await expect(messageBubble(hostPage, participantMessage)).toHaveAttribute(
      "data-chat-role",
      "participant",
    );
    await expect(messageBubble(hostPage, spectatorMessage)).toHaveAttribute(
      "data-chat-role",
      "spectator",
    );
  });

  test("recolors earlier spectator messages when the sender joins the tournament", async () => {
    await logInUser(hostPage, "user0", "pwd0000");
    const tournamentTitle = `Tournament recolor ${Date.now()}`;
    await createTournament(hostPage, tournamentTitle);

    await logInUser(spectatorPage, "user2", "pwd2222");
    await openTournamentFromList(spectatorPage, tournamentTitle);

    const spectatorMessage = `Will join later ${Date.now()}`;
    await sendMessage(spectatorPage, spectatorMessage);

    await expect(messageBubble(spectatorPage, spectatorMessage)).toHaveAttribute(
      "data-chat-role",
      "spectator",
    );

    await spectatorPage.getByRole("button", { name: "Join Tournament" }).click();
    await expect(spectatorPage.getByRole("button", { name: "Leave Tournament" })).toBeVisible();
    await expect(messageBubble(spectatorPage, spectatorMessage)).toHaveAttribute(
      "data-chat-role",
      "participant",
    );
  });
});
