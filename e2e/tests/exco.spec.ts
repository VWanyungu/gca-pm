import { test, expect } from "@playwright/test";
import { loginAs, NO_ACCESS } from "../fixtures";

// ExCo holds ExCo@global: in CAN_CREATE_PROJECT, but not CAN_MANAGE_USERS and not a SiteEngineer.
test.describe("ExCo (ExCo@global)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "exco");
  });

  // AC-PRJ-01 / CAN_CREATE_PROJECT includes ExCo
  test("TC-EXCO-01 sees New project control on home", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("New project").first()).toBeVisible();
  });

  // CAN_MANAGE_USERS = Admin@global only
  test("TC-EXCO-02 is denied user management (/admin)", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(NO_ACCESS)).toBeVisible();
  });

  test("TC-EXCO-03 is denied engineer area (/engineer)", async ({ page }) => {
    await page.goto("/engineer");
    await expect(page.getByText(NO_ACCESS)).toBeVisible();
  });
});
