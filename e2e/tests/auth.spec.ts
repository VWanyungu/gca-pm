import { test, expect } from "@playwright/test";
import { loginAs, USERS, PASSWORD, type Role } from "../fixtures";

// TC-AUTH-01..04: each role can authenticate and is taken off /login.
const AUTH_ID: Record<Role, string> = {
  admin: "TC-AUTH-01",
  pm: "TC-AUTH-02",
  exco: "TC-AUTH-03",
  engineer: "TC-AUTH-04",
};

for (const role of Object.keys(USERS) as Role[]) {
  test(`${AUTH_ID[role]} ${USERS[role].label} logs in successfully`, async ({ page }) => {
    await loginAs(page, role);
    await expect(page).not.toHaveURL(/\/login/);
  });
}

// TC-AUTH-05: wrong password is rejected and keeps the user on /login.
test("TC-AUTH-05 invalid password is rejected", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill(USERS.admin.email);
  await page.locator("#password").fill(`wrong-${PASSWORD}`);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
});
