import { test, expect } from "@playwright/test";
import { loginAs, NO_ACCESS } from "../fixtures";

// Admin holds Admin@global, which canAccess() treats as allow-all.
test.describe("Admin (Admin@global)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  // AC-IAM-01 / CAN_MANAGE_USERS
  test("TC-ADMIN-01 can open user management (/admin)", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText(NO_ACCESS)).toHaveCount(0);
  });

  // AC-PRJ-01 / CAN_CREATE_PROJECT
  test("TC-ADMIN-02 sees New project control on home", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("New project").first()).toBeVisible();
  });

  // engineer/layout.tsx admin override
  test("TC-ADMIN-03 can open engineer area (/engineer)", async ({ page }) => {
    await page.goto("/engineer");
    await expect(page.getByText(NO_ACCESS)).toHaveCount(0);
  });
});
