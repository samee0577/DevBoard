import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * The security invariant behind guest demo mode: a visitor with no session can browse
 * and edit the sandbox, and the application never issues a single request to the API.
 *
 * This is deliberately end-to-end. The no-restricted-imports ESLint rule stops the
 * sandbox folder from importing the api client, but only a real browser session proves
 * that every component on every /demo route resolves its data locally. Point one demo
 * component at the real gateway and this fails.
 */

// A guest session legitimately does talk to the network in two places: the auth page
// checks for an existing session before you choose "Explore as guest", and Vercel
// Analytics beacons fire. Neither is the API, so the assertion targets the API origin
// specifically instead of blanket-banishing external requests.
function apiOrigins(): string[] {
  const candidates = [".env", ".env.local", ".env.development", ".env.development.local"];
  for (const file of candidates) {
    const full = path.resolve(process.cwd(), file);
    if (!existsSync(full)) continue;

    const match = readFileSync(full, "utf8").match(/^\s*VITE_API_URL\s*=\s*(.+)$/m);
    if (!match) continue;

    return match[1].trim().replace(/^["']|["']$/g, "").split(",").map((url) => url.trim());
  }

  // Failing loudly beats passing vacuously: without this, a renamed env var would
  // silently turn the security assertion into a no-op.
  throw new Error("Could not find VITE_API_URL in any .env file, so this test cannot verify the guest never reaches the API.");
}

function trackApiRequests(page: import("@playwright/test").Page) {
  const origins = apiOrigins();
  const hits: string[] = [];
  page.on("request", (request) => {
    if (origins.some((origin) => origin && request.url().startsWith(origin))) {
      hits.push(request.url());
    }
  });
  return hits;
}

// Project names also appear inside per-card delete confirmation dialogs, which are
// always mounted, so every name lookup targets the card heading specifically.
function projectCard(page: import("@playwright/test").Page, name: string) {
  return page.getByRole("heading", { name, exact: true });
}

async function enterDemo(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore as guest" }).click();
  await expect(page).toHaveURL(/\/demo\/dashboard$/);
}

async function openDemoProject(page: import("@playwright/test").Page, name: string) {
  await projectCard(page, name).click();
  await expect(page).toHaveURL(/\/demo\/projectDetail\/\d+$/);
}

// The guest mode indicator is a pill in the header; the explanation and the reset
// action live in the popover it opens.
function guestPill(page: import("@playwright/test").Page) {
  return page.getByRole("button", { name: "Guest" });
}

test.describe("guest demo mode", () => {
  test("reaches the sandbox from the auth page without signing in", async ({ page }) => {
    await enterDemo(page);

    await expect(guestPill(page)).toBeVisible();
    await expect(projectCard(page, "Neon Storefront")).toBeVisible();
    await expect(projectCard(page, "Habit Tracker")).toBeVisible();
  });

  test("sits the mode indicator beside the wordmark and keeps the explanation in a popover", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await enterDemo(page);

    const pill = guestPill(page);
    await expect(pill).toBeVisible();

    const pillBox = (await pill.boundingBox())!;
    const titleBox = (await page.getByRole("heading", { name: "DEVBOARD" }).boundingBox())!;

    // Shares a row with the wordmark: to its right, and vertically centred against it.
    expect(pillBox.x).toBeGreaterThanOrEqual(titleBox.x + titleBox.width - 1);
    const pillMiddle = pillBox.y + pillBox.height / 2;
    const titleMiddle = titleBox.y + titleBox.height / 2;
    expect(Math.abs(pillMiddle - titleMiddle)).toBeLessThanOrEqual(12);

    // Still an inline indicator, not a full-width strip above the content.
    expect(pillBox.width).toBeLessThan(1280 * 0.2);
    expect(pillBox.height).toBeLessThan(60);

    // Nothing is explained until asked for. Matched exactly, because the locked
    // project dialog is always mounted and mentions a sample workspace too.
    await expect(page.getByText("Sample workspace", { exact: true })).toHaveCount(0);

    await pill.click();
    await expect(page.getByRole("dialog", { name: "Guest mode" })).toBeVisible();
    await expect(page.getByText("Sample workspace", { exact: true })).toBeVisible();
    await expect(page.getByText("saved only in this browser")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset demo" })).toBeVisible();

    // The panel opens toward the page interior, not off the left edge.
    const popoverBox = (await page.getByRole("dialog", { name: "Guest mode" }).boundingBox())!;
    expect(popoverBox.x).toBeGreaterThanOrEqual(0);
    expect(popoverBox.y).toBeGreaterThan(pillBox.y + pillBox.height);

    // Escape closes it and hands focus back to the pill.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Guest mode" })).toHaveCount(0);
  });

  test("closes the popover on an outside click", async ({ page }) => {
    await enterDemo(page);

    await guestPill(page).click();
    await expect(page.getByRole("dialog", { name: "Guest mode" })).toBeVisible();

    await page.getByRole("heading", { name: "DEVBOARD" }).click();
    await expect(page.getByRole("dialog", { name: "Guest mode" })).toHaveCount(0);
  });

  test("marks every demo card as a sample", async ({ page }) => {
    await enterDemo(page);

    // One badge per card, so nothing on the dashboard is mistaken for real work.
    const cards = page.locator(".project-card");
    await expect(cards).toHaveCount(4);
    await expect(page.locator(".projectCard-badge")).toHaveCount(4);
    await expect(page.getByText("Sample", { exact: true }).first()).toBeVisible();

    // It rides the card's top-right corner rather than sitting in a row of its own.
    const badge = (await page.locator(".projectCard-badge").first().boundingBox())!;
    const card = (await cards.first().boundingBox())!;
    expect(badge.x + badge.width).toBeLessThanOrEqual(card.x + card.width);
    expect(badge.y).toBeLessThan(card.y);

    // Clicking near it still opens the project, so it never swallows the card link.
    await page.getByRole("heading", { name: "Neon Storefront", exact: true }).click();
    await expect(page).toHaveURL(/\/demo\/projectDetail\/\d+$/);
  });

  test("exposes exactly one call to action in the header", async ({ page }) => {
    await enterDemo(page);

    // One CTA, no duplicated banner copy competing with it.
    await expect(page.getByRole("button", { name: "Sign up to save" })).toHaveCount(1);
  });

  test("never calls the API while browsing and editing the demo project", async ({ page }) => {
    const apiRequests = trackApiRequests(page);

    await enterDemo(page);
    await openDemoProject(page, "Neon Storefront");

    // Toggle a task. In the real app this is the /api/projects/toggleTask write.
    await page.locator("button.features").first().click();
    await page.locator("button.task-item").first().click();
    await page.waitForTimeout(800);

    // Edit the project, which saves through /api/projects in the real app.
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.locator('dialog[open] input[name="name"]').fill("Renamed In Sandbox");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Renamed In Sandbox" })).toBeVisible();
    await page.waitForTimeout(800);

    // Add a feature, which saves through /api/projects/:id/features in the real app.
    await page.getByRole("button", { name: "Add New feature" }).click();
    await page.locator('dialog[open] input[aria-label="Feature name"]').fill("Guest Feature");
    await page.locator('dialog[open] input[aria-label="Task 1"]').fill("Guest Task");
    await page.getByRole("button", { name: "Add feature" }).click();
    await page.waitForTimeout(800);

    // Delete a feature.
    await page.locator('button[aria-label^="Options for"]').first().click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Delete feature" }).click();
    await page.waitForTimeout(800);

    expect(apiRequests).toEqual([]);
  });

  test("keeps guest edits across a reload", async ({ page }) => {
    await enterDemo(page);
    await openDemoProject(page, "Neon Storefront");

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.locator('dialog[open] input[name="name"]').fill("Persisted Edit");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Persisted Edit" })).toBeVisible();

    // A hard reload lands straight back in the sandbox from localStorage.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Persisted Edit" })).toBeVisible();
  });

  test("reset restores the original fixture", async ({ page }) => {
    await enterDemo(page);
    await openDemoProject(page, "Neon Storefront");

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.locator('dialog[open] input[name="name"]').fill("Temporary Name");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Temporary Name" })).toBeVisible();

    await guestPill(page).click();
    await page.getByRole("button", { name: "Reset demo" }).click();

    await expect(page.getByRole("heading", { name: "Neon Storefront" })).toBeVisible();
  });

  test("locks project creation and explains why", async ({ page }) => {
    await enterDemo(page);

    await page.getByRole("button", { name: /New Project/ }).click();

    await expect(page.getByText("Sign up to create your own project")).toBeVisible();
  });

  test("offers no route for creating a project", async ({ page }) => {
    const apiRequests = trackApiRequests(page);
    await page.goto("/demo/newProject");

    // No newProject route exists under /demo, so the sandbox never renders.
    await expect(page.getByText("Sign up to create your own project")).toHaveCount(0);
    await expect(guestPill(page)).toHaveCount(0);
    expect(apiRequests).toEqual([]);
  });

  test("still guards the real dashboard behind a session", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/$/);
  });
});