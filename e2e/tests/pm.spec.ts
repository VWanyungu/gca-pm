import { test, expect } from "@playwright/test";
import { loginAs, NO_ACCESS } from "../fixtures";

// PM holds PM@project only (not global). Not in CAN_CREATE_PROJECT / CAN_MANAGE_USERS.
test.describe("PM (PM@project)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "pm");
  });

  // CAN_MANAGE_USERS = Admin@global only
  test("TC-PM-01 is denied user management (/admin)", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(NO_ACCESS)).toBeVisible();
  });

  // CAN_CREATE_PROJECT excludes PM
  test("TC-PM-02 does NOT see New project control on home", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("New project")).toHaveCount(0);
  });

  // engineer/layout.tsx: requires SiteEngineer grant or Admin@global
  test("TC-PM-03 is denied engineer area (/engineer)", async ({ page }) => {
    await page.goto("/engineer");
    await expect(page.getByText(NO_ACCESS)).toBeVisible();
  });
});
