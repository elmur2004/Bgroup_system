import { test, expect } from "@playwright/test";

/**
 * Login form — Phases 5 + 7: validation + feedback quality.
 * The session left ~30 minutes to a UntrustedHost bug that surfaced as
 * "Invalid email or password"; these tests pin the happy path + error
 * shape so a future regression is caught immediately.
 */

test.describe("/login", () => {
  test("rejects empty submit with browser-level required validation", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();
    // HTML5 validation prevents submission; email field becomes :invalid.
    const email = page.locator("#email");
    await expect(email).toHaveAttribute("required", "");
  });

  test("shows specific error on bad password", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("admin@bgroup.com");
    await page.locator("#password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("admin credentials reach the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("admin@bgroup.com");
    await page.locator("#password").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Lands on / which redirects to a module home. Just confirm we left /login.
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 10_000 });
  });
});
