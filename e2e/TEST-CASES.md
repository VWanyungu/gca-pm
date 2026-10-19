# GCA PDM — E2E Test Cases (Playwright)

Smoke + role-based access control (RBAC) across the four roles: **Engineer, Admin, PM, ExCo**.
This file is the source of truth: **each Playwright test's title is its `TC-ID` below**, so a test run reads
directly against this catalogue. Requirement IDs (`AC-*`) link back to
[`backend/docs/app-constraints.md`](../backend/docs/app-constraints.md) (companion to SRS v0.6).

## Test accounts

All seeded in [`backend/v1/seeds/01_users.ts`](../backend/v1/seeds/01_users.ts) and
[`backend/v1/seeds/04_roles.ts`](../backend/v1/seeds/04_roles.ts). **Shared password: `password`.**

| Role     | Email                               | Grant(s)                   |
|----------|-------------------------------------|----------------------------|
| Admin    | `admin@gasconnectafrica.com`        | `Admin@global`             |
| PM       | `pm@gasconnectafrica.com`           | `PM@project` (P1, P2)      |
| ExCo     | `exco@gasconnectafrica.com`         | `ExCo@global`              |
| Engineer | `site.engineer@gasconnectafrica.com`| `SiteEngineer@project` (P1, P3) |

## How to run

Tests run against the **already-running local dev servers** (frontend `:3001`, backend `:3000`).
No DB reseed — they rely on the users above already existing.

```bash
cd e2e
npm install            # first time only
npx playwright install chromium   # first time only
npm test               # runs all specs; npm run report opens the HTML report
```

## Expectations derived from the access matrix

Source: [`frontend/lib/access-control.ts`](../frontend/lib/access-control.ts) (mirrors the backend `authorize()` middleware).

| Capability               | Admin | ExCo | PM  | Engineer |
|--------------------------|:-----:|:----:|:---:|:--------:|
| Log in                   |  ✅   |  ✅  | ✅  |   ✅     |
| User mgmt `/admin`       |  ✅   |  ❌  | ❌  |   ❌     |
| Create project (home)    |  ✅   |  ✅  | ❌  |   ❌     |
| Engineer area `/engineer`|  ✅   |  ❌  | ❌  |   ✅     |

Denial is the inline copy *"You don't have access to this page."* from the admin/engineer layouts.

## Test cases

### Authentication — `tests/auth.spec.ts`

| TC-ID      | Role     | Precondition | Steps                                               | Expected                         | AC ref |
|------------|----------|--------------|-----------------------------------------------------|----------------------------------|--------|
| TC-AUTH-01 | Admin    | Logged out   | Open `/login`, enter email + `password`, submit     | Redirected off `/login`          | NFR-SEC |
| TC-AUTH-02 | PM       | Logged out   | As above                                            | Redirected off `/login`          | NFR-SEC |
| TC-AUTH-03 | ExCo     | Logged out   | As above                                            | Redirected off `/login`          | NFR-SEC |
| TC-AUTH-04 | Engineer | Logged out   | As above                                            | Redirected off `/login`          | NFR-SEC |
| TC-AUTH-05 | Admin    | Logged out   | Open `/login`, enter email + **wrong** password, submit | Stays on `/login` (rejected) | NFR-SEC |

### Admin — `tests/admin.spec.ts`

| TC-ID       | Precondition     | Steps                     | Expected                                  | AC ref     |
|-------------|------------------|---------------------------|-------------------------------------------|------------|
| TC-ADMIN-01 | Logged in as Admin | Navigate to `/admin`    | Page loads, **no** access-denied message  | AC-IAM-01  |
| TC-ADMIN-02 | Logged in as Admin | Navigate to `/`         | **"New project"** control is visible      | AC-PRJ-01  |
| TC-ADMIN-03 | Logged in as Admin | Navigate to `/engineer` | Engineer area loads (admin override)      | AC-DPR-01  |

### PM — `tests/pm.spec.ts`

| TC-ID    | Precondition    | Steps                     | Expected                              | AC ref    |
|----------|-----------------|---------------------------|---------------------------------------|-----------|
| TC-PM-01 | Logged in as PM | Navigate to `/admin`      | Access-denied message shown           | AC-IAM-01 |
| TC-PM-02 | Logged in as PM | Navigate to `/`           | **No** "New project" control          | AC-PRJ-01 |
| TC-PM-03 | Logged in as PM | Navigate to `/engineer`   | Access-denied message shown           | AC-DPR-01 |

### ExCo — `tests/exco.spec.ts`

| TC-ID      | Precondition      | Steps                   | Expected                           | AC ref    |
|------------|-------------------|-------------------------|------------------------------------|-----------|
| TC-EXCO-01 | Logged in as ExCo | Navigate to `/`         | **"New project"** control visible  | AC-PRJ-01 |
| TC-EXCO-02 | Logged in as ExCo | Navigate to `/admin`    | Access-denied message shown        | AC-IAM-01 |
| TC-EXCO-03 | Logged in as ExCo | Navigate to `/engineer` | Access-denied message shown        | AC-DPR-01 |

### Engineer — `tests/engineer.spec.ts`

| TC-ID     | Precondition          | Steps                   | Expected                          | AC ref    |
|-----------|-----------------------|-------------------------|-----------------------------------|-----------|
| TC-ENG-01 | Logged in as Engineer | Navigate to `/engineer` | Engineer area loads               | AC-DPR-01 |
| TC-ENG-02 | Logged in as Engineer | Navigate to `/admin`    | Access-denied message shown       | AC-IAM-01 |
| TC-ENG-03 | Logged in as Engineer | Navigate to `/`         | **No** "New project" control      | AC-PRJ-01 |

## Not covered (deliberately, this pass)

Core workflows (DPR submit, weekly approval, schedule upload, change-request decisions) and
project-scoped boundary cases (e.g. PM of project 1 blocked from project 3). Add as a second pass —
each would get its own `TC-<AREA>-NN` row here plus a mirrored test.
