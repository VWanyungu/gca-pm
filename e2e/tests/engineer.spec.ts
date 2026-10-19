import { test, expect } from "@playwright/test";
import { loginAs, NO_ACCESS } from "../fixtures";

// Engineer holds SiteEngineer@project: can enter /engineer, but not /admin or project creation.
test.describe("Engineer (SiteEngineer@project)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "engineer");
  });

  // engineer/layout.tsx allows SiteEngineer grant
  test("TC-ENG-01 can open engineer area (/engineer)", async ({ page }) => {
    await page.goto("/engineer");
    await expect(page).toHaveURL(/\/engineer/);
    await expect(page.getByText(NO_ACCESS)).toHaveCount(0);
  });

  // CAN_MANAGE_USERS = Admin@global only
  test("TC-ENG-02 is denied user management (/admin)", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(NO_ACCESS)).toBeVisible();
  });

  // CAN_CREATE_PROJECT excludes SiteEngineer
  test("TC-ENG-03 does NOT see New project control on home", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("New project")).toHaveCount(0);
  });
});
