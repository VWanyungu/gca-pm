import type { Page } from "@playwright/test";

// Seed accounts (backend/v1/seeds/01_users.ts + 04_roles.ts). Shared password = "password".
export const PASSWORD = "password";

export const USERS = {
  admin: { email: "admin@gasconnectafrica.com", label: "Admin", grant: "Admin@global" },
  pm: { email: "pm@gasconnectafrica.com", label: "PM", grant: "PM@project:1,2" },
  exco: { email: "exco@gasconnectafrica.com", label: "ExCo", grant: "ExCo@global" },
  engineer: {
    email: "site.engineer@gasconnectafrica.com",
    label: "Engineer",
    grant: "SiteEngineer@project:1,3",
  },
} as const;

export type Role = keyof typeof USERS;

// Matches the inline denial copy in admin/layout.tsx and engineer/layout.tsx
// ("You don't have access to this page."). Regex dodges the apostrophe.
export const NO_ACCESS = /don.t have access to this page/i;

export async function loginAs(page: Page, role: Role): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(USERS[role].email);
  await page.locator("#password").fill(PASSWORD);
  // Inputs aren't inside a <form>; submit is a button onClick, so Enter won't submit — click it.
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  // On success the app redirects to "/" (consumeRedirectPath default). Failed auth stays on /login.
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 15000 });
}
