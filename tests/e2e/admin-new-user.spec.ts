import { test, expect } from "@playwright/test";

/**
 * /admin/users/new — the unified user creation form. Multi-section, with
 * module toggles + dependent dropdowns. The form is the highest-value place
 * to verify validation + feedback quality because it's the most complex.
 */

async function signInAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator("#email").fill("admin@bgroup.com");
  await page.locator("#password").fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 10_000 });
}

test.describe("/admin/users/new", () => {
  test("page loads and shows the section headers", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/admin/users/new");
    await expect(page.getByRole("heading", { name: /new user/i })).toBeVisible();
    await expect(page.getByText(/account/i).first()).toBeVisible();
  });

  test("rejects submission with missing email (server-side 400)", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/admin/users/new");

    // Fire the POST directly via fetch — empty body should be rejected.
    const status = await page.evaluate(async () => {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return r.status;
    });
    expect(status).toBe(400);
  });

  test("server rejects manually-assigned team_lead role", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/admin/users/new");

    const result = await page.evaluate(async () => {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "playwright-tl-test@example.com",
          password: "TestPass123!",
          name: "Playwright Test",
          hr: {
            employeeId: "PW-TL-001",
            fullNameEn: "PW User",
            fullNameAr: "بي دبليو",
            nationalId: "PW-NID-001",
            gender: "male",
            companyId: "any",
            roles: ["team_lead"],
          },
        }),
      });
      const body = await r.json().catch(() => null);
      return { status: r.status, error: body?.error };
    });
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/team_lead.*auto-derived/i);
  });
});
