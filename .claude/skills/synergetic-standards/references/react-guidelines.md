---
title: "React Frontend Guidelines"
description: "How to build React frontends: folder structure, naming, TypeScript and ESLint config, Tailwind styling, reusable components, the API client, useQuery/useMutation patterns, Better Auth with ProtectedRoute/GuestRoute/RoleGate wrappers, routing, forms, error handling, state management, testing, and DirectAdmin deployment. Read before writing or changing any frontend code."
---

# React Frontend Guidelines

How to structure and write React frontends in Synergetic projects. Based on the `VWanyungu/Revision-Access-Point/clientFrontend` reference repo, **adapted to the Synergetic stack** (Express + Knex backend, Better Auth, SharePoint, DirectAdmin hosting) and with the reference repo's gaps fixed.

> **Reference repo vs. this guide:** The reference repo talks to Supabase directly, guards routes in `useEffect`, and does writes without `useMutation`. **Do not copy those patterns.** Where this guide differs from the reference repo, this guide wins.

## Contents

- [Core rules for Claude](#core-rules-for-claude)
- [1. Project structure](#1-project-structure)
- [2. TypeScript](#2-typescript)
- [3. Linting](#3-linting)
- [4. Core dependencies](#4-core-dependencies)
- [5. Styling (Tailwind)](#5-styling-tailwind)
- [6. Reusable components](#6-reusable-components)
- [7. API / data layer](#7-api--data-layer)
- [8. React Query](#8-react-query)
- [9. Authentication (Better Auth)](#9-authentication-better-auth)
- [10. Routing](#10-routing)
- [11. Forms](#11-forms)
- [12. Error handling](#12-error-handling)
- [13. State management](#13-state-management)
- [14. Hooks](#14-hooks)
- [15. Animation](#15-animation)
- [16. Build, environment & deployment](#16-build-environment--deployment)
- [17. Testing (Vitest)](#17-testing-vitest)
- [18. Provider nesting](#18-provider-nesting-apptsx)
- [19. Pre-PR checklist for Claude](#19-pre-pr-checklist-for-claude)

## Core rules for Claude

1. **TypeScript + Tailwind + shadcn/ui** for every component.
2. **All server reads go through `useQuery`; all server writes go through `useMutation`.** No bare `fetch` calls in event handlers.
3. **All HTTP calls go through `src/api/client.ts`.** Components never call `fetch` directly.
4. **Protected pages sit behind `<ProtectedRoute />`.** Never check auth in a page-level `useEffect`.
5. **Reuse before creating.** Check `components/ui/` and `components/shared/` before writing a new component.
6. **Sonner is the only toast system.**
7. **react-hook-form + zod** for any form with more than 2 fields.
8. **No secrets in the frontend.** Only `VITE_*` env vars, and only public values.

---

## 1. Project structure

```
src/
  api/
    client.ts          # fetch wrapper: base URL, credentials, errors
    query-keys.ts      # query key factory
    [domain].ts        # data functions per domain: users.ts, payments.ts
  components/
    auth/              # ProtectedRoute, GuestRoute, RoleGate
    layout/            # AppLayout, Navbar, Sidebar
    shared/            # Reusable app-level components (DataTable, PageHeader, EmptyState)
    ui/                # shadcn/ui primitives (generated, lightly customised)
    [domain]/          # Feature components: payment/, registration/
  hooks/
    queries/           # Reusable query/mutation hooks: use-users.ts
    use-*.ts           # Generic hooks: use-mobile.ts, use-long-press.ts
  lib/
    auth-client.ts     # Better Auth client
    utils.ts           # cn() + shared helpers
    offline/           # IndexedDB write queue (only if offline is required)
  pages/
    [Name]Page.tsx     # Route-level pages
  routes/
    index.tsx          # Route tree
  schemas/
    [domain].ts        # zod schemas shared by forms and API types
  types/
    [domain].ts        # Shared TypeScript types
  test/
    setup.ts
  App.tsx              # Providers + router
  main.tsx             # Entry point
  index.css            # Tailwind, CSS variables, theming
```

### Naming

| Item | Convention | Example |
|---|---|---|
| Folders | lowercase / kebab-case | `components`, `hooks/queries` |
| Component files | PascalCase | `AppLayout.tsx`, `StudyDashboard.tsx` |
| Page files | PascalCase + `Page` | `LoginPage.tsx` |
| Hook files | kebab-case, `use-` prefix | `use-mobile.ts`, `use-long-press.ts` |
| Hook names | camelCase, `use` prefix | `useIsMobile`, `useLongPress` |
| shadcn primitives | kebab-case | `alert-dialog.tsx` |
| Utility / api / schema files | kebab-case | `utils.ts`, `query-keys.ts` |
| Types & interfaces | PascalCase | `PaymentData`, `AppLayoutProps` |
| Constants | SCREAMING_SNAKE_CASE | `MOBILE_BREAKPOINT` |

Use `.tsx` only for files containing JSX; otherwise `.ts`.

---

## 2. TypeScript

```jsonc
// tsconfig.app.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- **Strict mode on for new projects.** (The reference repo is non-strict; don't carry that over.) For existing non-strict projects, don't flip it as part of an unrelated change. Use a `chore/` branch.
- Always import via the `@/` alias, never long relative paths (`../../../`).
- No `any`. Use `unknown` and narrow it. Infer form/API types from zod schemas with `z.infer`.
- Type component props with an `interface` named `[Component]Props`.

---

## 3. Linting

ESLint 9 flat config:

```js
// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2020, globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
);
```

`lint` and `tsc --noEmit` must pass in CI (GitHub Actions) before merge.

---

## 4. Core dependencies

| Category | Package |
|---|---|
| React | `react`, `react-dom` (^18.3) |
| Router | `react-router-dom` (^6.30) |
| Server state | `@tanstack/react-query` (^5) |
| Auth | `better-auth` (React client) |
| Forms | `react-hook-form`, `zod`, `@hookform/resolvers` |
| UI | shadcn/ui (`@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`) |
| CSS | `tailwindcss` (^3.4), `tailwindcss-animate`, `@tailwindcss/typography` |
| Icons | `lucide-react` |
| Toasts | `sonner` |
| Errors | `react-error-boundary` |
| Theming | `next-themes` or the custom `ThemeProvider` (§15) |
| Animation | `framer-motion` (optional) |
| Charts | `recharts` (optional) |
| Dates | `date-fns`, `react-day-picker` |
| Offline | `dexie` or raw IndexedDB (only when offline is required) |
| PWA | `vite-plugin-pwa` (only when app-like experience is required) |
| Build | `vite`, `@vitejs/plugin-react-swc` |
| Test | `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` |
| Package manager | **Bun** |

**Do not add:** axios, Redux, Zustand, Jotai, MobX, styled-components, Emotion, Material UI, Chakra, a second toast library, or `@supabase/supabase-js`. Ask the user first if you think one is needed.

---

## 5. Styling (Tailwind)

### Theme via HSL CSS variables

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 210 40% 98%;
    --foreground: 217 33% 17%;
    --primary: 199 89% 48%;
    --primary-foreground: 0 0% 100%;
    --success: 142 76% 36%;
    --warning: 38 92% 50%;
    --radius: 0.625rem;
  }
  .dark {
    --background: 229 84% 5%;
    --foreground: 215 20% 65%;
    --primary: 198 93% 60%;
  }
}
```

Expose them in `tailwind.config.ts` as `hsl(var(--primary))` etc., with `darkMode: ["class"]`.

### `cn()` helper

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Rules

- **Use theme tokens, never raw colours:** `bg-primary text-primary-foreground`, not `bg-sky-500` or `#0ea5e9`.
- **Mobile-first:** base classes for mobile, then `md:` / `lg:` (`grid-cols-1 md:grid-cols-3`, `hidden md:flex`).
- **Merge classes with `cn()`** whenever a component accepts `className`.
- **Variants with CVA**, not conditional class soup (see §6).
- Dark mode is class-based (`.dark` on `<html>`).
- Put repeated multi-class patterns in `@layer components` (e.g. `.glass-card`, `.shadow-card`) only when used in 3+ places. Otherwise extract a component.
- Container: centred, `2rem` padding, max `1400px`.
- Dialog widths: `w-[calc(100%-2rem)] md:max-w-2xl`.
- No inline `style={{}}` except for truly dynamic values (e.g. computed widths).

---

## 6. Reusable components

### Layers

| Layer | Folder | What goes here |
|---|---|---|
| Primitives | `components/ui/` | shadcn/ui: Button, Input, Dialog, Select… Generated with `bunx shadcn@latest add <name>`. |
| Shared | `components/shared/` | App-wide building blocks composed from primitives: `PageHeader`, `EmptyState`, `DataTable`, `ConfirmDialog`, `FormField`, `LoadingState`. |
| Domain | `components/[domain]/` | Feature-specific: `PaymentSummary`, `HouseholdForm`. |
| Pages | `pages/` | Route-level composition only: fetch data, arrange components. Minimal markup. |

**Extract a component when** markup is repeated twice, or a file passes ~200 lines, or a block has its own state/logic.

### Variants with CVA

```tsx
// components/ui/button.tsx (excerpt)
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3",
        lg: "h-11 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
```

Add a new variant to the existing component instead of creating `PrimaryButton`, `DangerButton`, etc.

### Shared component pattern

```tsx
// components/shared/EmptyState.tsx
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-12 text-center", className)}>
      <Icon className="h-10 w-10 text-muted-foreground" />
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
```

### Reusable component rules

- Accept `className` and merge it with `cn()`.
- Spread remaining native props (`...props`) onto the root element for primitives/wrappers.
- Use `forwardRef` for anything wrapping a native element or Radix primitive, and set `displayName`.
- Prefer **composition** (`children`, slots like `action`, `footer`) over boolean flags (`showFooter`, `isCompact`).
- Keep shared components **data-agnostic**: they receive data via props and never call `useQuery` themselves.
- Handle loading / empty / error states explicitly. Use `LoadingState`, `EmptyState`, and the error UI.

### File layout

1. Imports
2. Types / interfaces
3. Constants
4. Small private sub-components (co-located, not exported unless reused)
5. Main component
6. Export: **named exports** for components; `default export` only for pages (needed for `React.lazy`)

```tsx
// forwardRef wrapper example
const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, ...props }, ref) => (
    <RouterNavLink
      ref={ref}
      className={({ isActive }) => cn(className, isActive && activeClassName)}
      {...props}
    />
  ),
);
NavLink.displayName = "NavLink";
```

Icons: `lucide-react`, sized with classes (`<Mail className="h-4 w-4" />`).

---

## 7. API / data layer

The frontend talks **only** to the Node/Express backend. No direct database or third-party SDK calls from the browser. File uploads go to the backend, which stores them in SharePoint.

### API client

```ts
// src/api/client.ts
const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include", // send Better Auth session cookie
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? res.statusText, body.details);
  }

  return res.status === 204 ? (undefined as T) : res.json();
}
```

### Domain data functions

```ts
// src/api/households.ts
import { api } from "./client";
import type { Household, HouseholdInput } from "@/types/household";

export const getHouseholds = (search?: string) =>
  api<Household[]>(`/households${search ? `?search=${encodeURIComponent(search)}` : ""}`);

export const getHousehold = (id: string) => api<Household>(`/households/${id}`);

export const createHousehold = (input: HouseholdInput) =>
  api<Household>("/households", { method: "POST", body: JSON.stringify(input) });

export const updateHousehold = (id: string, input: Partial<HouseholdInput>) =>
  api<Household>(`/households/${id}`, { method: "PATCH", body: JSON.stringify(input) });
```

### Rules

- Native `fetch` via `api()` only. No axios.
- **Data functions throw on error; they do not return `null`.** React Query needs the throw to populate `error` and trigger retries. (This replaces the reference repo's `return null` pattern.)
- One file per domain in `src/api/`.
- Env vars via `import.meta.env.VITE_*` only.

---

## 8. React Query

### Client setup

```ts
// src/App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Query keys: use a factory

```ts
// src/api/query-keys.ts
export const queryKeys = {
  households: {
    all: ["households"] as const,
    list: (search?: string) => ["households", "list", { search }] as const,
    detail: (id: string) => ["households", "detail", id] as const,
  },
} as const;
```

Never hand-type key arrays in components. Always use `queryKeys`.

### `useQuery`

```tsx
// Simple
const { data: households = [], isLoading, error } = useQuery({
  queryKey: queryKeys.households.list(search),
  queryFn: () => getHouseholds(search),
});

// Dependent: wait for an id
const { data: household } = useQuery({
  queryKey: queryKeys.households.detail(id!),
  queryFn: () => getHousehold(id!),
  enabled: !!id,
});
```

- Default list data with destructuring: `data: items = []`.
- Use `enabled` for dependent queries.
- Render `isLoading` → `LoadingState`, `error` → inline error, empty → `EmptyState`.
- Inline `useQuery` is fine for one-off use. **If the same query is used in 2+ places, extract a hook** in `hooks/queries/`:

```ts
// src/hooks/queries/use-households.ts
export const useHouseholds = (search?: string) =>
  useQuery({
    queryKey: queryKeys.households.list(search),
    queryFn: () => getHouseholds(search),
  });
```

### `useMutation`: required for every write

```tsx
const queryClient = useQueryClient();

const { mutate: create, isPending } = useMutation({
  mutationFn: createHousehold,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.households.all });
    toast.success("Household registered");
  },
  onError: (err) => toast.error(err.message),
});

// in a handler / form submit
create(values);
```

Rules:

- **Every POST/PUT/PATCH/DELETE uses `useMutation`.** No `await fetch(...)` in `onClick`.
- **Invalidate** affected keys in `onSuccess` instead of calling `refetch()` manually.
- Disable submit buttons with `isPending`.
- Use optimistic updates (`onMutate` + rollback in `onError`) only where latency is noticeable, like toggles and likes.
- For **offline-capable** apps, the `mutationFn` writes to the IndexedDB queue when `!navigator.onLine` and the queue replays on reconnect (see `tech-stack.md` → Offline pattern).

---

## 9. Authentication (Better Auth)

### Auth client

```ts
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
});

export const { useSession, signIn, signUp, signOut } = authClient;
```

### Common calls

```ts
await signIn.email({ email, password });
await signUp.email({ email, password, name });
await signIn.social({ provider: "google", callbackURL: `${import.meta.env.VITE_FRONTEND_URL}/dashboard` });
await authClient.requestPasswordReset({ email, redirectTo: `${import.meta.env.VITE_FRONTEND_URL}/reset-password` });
await signOut();
```

Better Auth method names can shift between versions. Check the installed version's docs if a call fails.

### Rules

- **Session lives in Better Auth's httpOnly cookie.** Never store the user or tokens in `localStorage`. Read the user from `useSession()`.
- Send cookies with `credentials: "include"` (already in `api()`). The backend must enable CORS with credentials for `VITE_FRONTEND_URL`.
- After sign-out, call `queryClient.clear()` so no cached data leaks to the next user.

### Auth wrapper components

**`ProtectedRoute`** is a layout route that blocks unauthenticated users:

```tsx
// src/components/auth/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { LoadingState } from "@/components/shared/LoadingState";

interface ProtectedRouteProps {
  roles?: string[];
  redirectTo?: string;
}

export function ProtectedRoute({ roles, redirectTo = "/login" }: ProtectedRouteProps) {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (isPending) return <LoadingState fullPage />;

  if (!session) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(session.user.role ?? "")) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
```

**`GuestRoute`** keeps signed-in users away from login/signup:

```tsx
// src/components/auth/GuestRoute.tsx
export function GuestRoute() {
  const { data: session, isPending } = useSession();
  if (isPending) return <LoadingState fullPage />;
  return session ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
```

**`RoleGate`** hides UI fragments by role:

```tsx
// src/components/auth/RoleGate.tsx
interface RoleGateProps {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { data: session } = useSession();
  return roles.includes(session?.user.role ?? "") ? <>{children}</> : <>{fallback}</>;
}
```

After login, send the user back to `location.state?.from?.pathname ?? "/dashboard"`.

> `session.user.role` requires Better Auth's admin plugin (or a custom `role` field). **Frontend guards are UX only. The Express backend must enforce auth and roles on every protected endpoint.**

---

## 10. Routing

### Route tree

```tsx
// src/routes/index.tsx
import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { AppLayout } from "@/components/layout/AppLayout";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const HouseholdsPage = lazy(() => import("@/pages/HouseholdsPage"));
const HouseholdDetailPage = lazy(() => import("@/pages/HouseholdDetailPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const UnauthorizedPage = lazy(() => import("@/pages/UnauthorizedPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

export function AppRoutes() {
  return (
    <Routes>
      {/* Public, guests only */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/households" element={<HouseholdsPage />} />
          <Route path="/households/:id" element={<HouseholdDetailPage />} />
        </Route>
      </Route>

      {/* Role-restricted */}
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
```

`AppLayout` renders `<Outlet />` for the page content.

### Rules

- **URL-based routing for every screen.** Don't use a `useState<AppState>` state machine for top-level navigation (it breaks refresh, back button, and deep links). Local step state is fine *inside* a page for multi-step flows (see §11).
- **Lazy-load every page** with `React.lazy` and wrap `<AppRoutes />` in `<Suspense>`.
- **Guard with layout routes** (`ProtectedRoute`, `GuestRoute`), not `useEffect` redirects.
- Nest pages under `AppLayout` via `<Outlet />`; layouts are never re-rendered per page.
- Read params with `useParams`, search/filter state with `useSearchParams` (so filters survive refresh and are shareable).
- Navigate with `<Link>` / `<NavLink>` or `useNavigate()`, never `window.location`.
- Catch-all `*` → `NotFoundPage`.
- **SPA fallback** on DirectAdmin/Apache: ship `public/.htaccess` (see §16).

---

## 11. Forms

### react-hook-form + zod (default for >2 fields)

```tsx
// src/schemas/household.ts
import { z } from "zod";

export const householdSchema = z.object({
  headName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().regex(/^(07\d{8}|01\d{8}|254[71]\d{8})$/, "Invalid Kenyan phone number"),
  members: z.coerce.number().int().min(1, "At least 1 member"),
});

export type HouseholdInput = z.infer<typeof householdSchema>;
```

```tsx
// components/registration/HouseholdForm.tsx
const form = useForm<HouseholdInput>({
  resolver: zodResolver(householdSchema),
  defaultValues: { headName: "", email: "", phone: "", members: 1 },
});

const { mutate, isPending } = useMutation({ mutationFn: createHousehold, /* ... */ });

<form onSubmit={form.handleSubmit((values) => mutate(values))} className="space-y-4">
  <FormField label="Head of household" error={form.formState.errors.headName?.message}>
    <Input {...form.register("headName")} />
  </FormField>
  {/* ... */}
  <Button type="submit" className="w-full" disabled={isPending}>
    {isPending ? <Loader className="h-4 w-4 animate-spin" /> : "Save"}
  </Button>
</form>
```

(shadcn's `Form` / `FormField` components are an acceptable alternative to a custom `FormField`. Pick one per project.)

### Rules

- Schemas live in `src/schemas/` and are the **single source of types** for the form and the API input. Share them with the backend where possible.
- Simple forms (≤2 fields, e.g. login) may use `useState` + `onChange` + native `required`.
- Submit goes through `useMutation`; button disabled while `isPending` and shows a spinner.
- Show field errors under each field; show server errors via `toast.error`.
- Icon-prefixed inputs: icon `absolute left-3 top-1/2 -translate-y-1/2`, input `pl-10`.
- **Forms rule (from git workflow):** one developer per form at a time, one ticket per form.
- Multi-step forms: `useState<Step>` inside the page + `AnimatePresence mode="wait"`. Validate each step with `form.trigger([...fields])` before advancing.

---

## 12. Error handling

### Toasts: Sonner only

```tsx
import { toast } from "sonner";
toast.success("Saved");
toast.error("Something went wrong");
```

Render a single `<Toaster />` from `sonner` in `App.tsx`. Do not add the Radix `use-toast` hook.

### Error Boundary

```tsx
import { ErrorBoundary } from "react-error-boundary";

<ErrorBoundary fallback={<div className="p-8 text-center">Something went wrong. Please refresh.</div>}>
  <Suspense fallback={<LoadingState fullPage />}>
    <AppRoutes />
  </Suspense>
</ErrorBoundary>
```

### Rules

- API errors surface as `ApiError` → React Query `error` (reads) or `onError` → `toast.error` (writes).
- On a `401` from the API, redirect to `/login` (handle once, e.g. in a global `QueryCache`/`MutationCache` `onError`).
- No silent `catch {}`. Either handle the error or let it propagate.
- Don't leave `console.log` in committed code. `console.error` is acceptable in catch blocks.

---

## 13. State management

| State type | Tool |
|---|---|
| Server data | **React Query**: never copy query data into `useState` |
| Session / user | **Better Auth `useSession()`** |
| URL state (filters, tabs, pagination) | **`useSearchParams`** |
| Form state | **react-hook-form** |
| Local UI state | `useState` / `useReducer` |
| Cross-cutting UI state (theme, sidebar) | **React Context + custom hook** in the same file |
| Per-device preferences | `localStorage` (theme, sidebar collapsed), never auth data |
| Offline queue | IndexedDB |

No Redux, Zustand, Jotai, or MobX.

### Context pattern

```tsx
// components/theme-provider.tsx
type Theme = "dark" | "light" | "system";

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({ children, defaultTheme = "system", storageKey = "app-theme" }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );
  // apply `.dark` class to document.documentElement; follow system when "system"
  // ...
}

export function useTheme() {
  const ctx = useContext(ThemeProviderContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
```

---

## 14. Hooks

- Named exports, `use` prefix, one hook per file in `hooks/` (query hooks in `hooks/queries/`).
- Clean up every listener / timer / subscription in the effect's return.
- Hooks must not render UI or show toasts unless that is their stated purpose.

```ts
// hooks/use-mobile.ts
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
```

---

## 15. Animation

- `framer-motion` for entrance animations, scroll reveals, and multi-step transitions.
- Always respect `useReducedMotion()`.
- Wrap reusable animations in shared components (e.g. `FadeIn`) rather than repeating `motion.div` props.

---

## 16. Build, environment & deployment

### Vite config

```ts
// vite.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: { host: "::", port: 8080 },
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
```

Add `vite-plugin-pwa` only when the project needs an app-like/offline experience.

### Environment variables

```
# .env.example (commit this; never commit .env)
VITE_API_URL=
VITE_FRONTEND_URL=
```

- Only `VITE_*` vars reach the browser, so they are **public**. Never put secrets, DB credentials, or SharePoint/Graph keys in the frontend.
- Access via `import.meta.env.VITE_*`; add types in `src/vite-env.d.ts`.

### Deployment (DirectAdmin / HostPinnacle)

1. GitHub Actions runs `bun install`, `bun run lint`, `bunx tsc --noEmit`, `bun run test`, `bun run build`.
2. The `dist/` output is deployed to the domain's `public_html` (or subdomain folder).
3. SPA fallback via `public/.htaccess` (Vite copies it into `dist/`):

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 17. Testing (Vitest)

```bash
bun add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

```ts
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";
```

- Test files sit next to the code: `HouseholdForm.test.tsx`.
- Priorities: zod schemas, shared components, auth wrappers (`ProtectedRoute` redirects), and critical forms.
- Wrap components needing React Query / router in a `renderWithProviders` helper in `src/test/`.
- Test commits use the `test:` type.

---

## 18. Provider nesting (`App.tsx`)

```tsx
export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="app-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <BrowserRouter>
            <ErrorBoundary fallback={<ErrorFallback />}>
              <Suspense fallback={<LoadingState fullPage />}>
                <AppRoutes />
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

---

## 19. Pre-PR checklist for Claude

- [ ] New screens are routes in `routes/index.tsx`, lazy-loaded, and protected with `ProtectedRoute` where needed
- [ ] Reads use `useQuery` with keys from `queryKeys`; writes use `useMutation` with invalidation
- [ ] All HTTP goes through `api()`; nothing calls `fetch` directly in components
- [ ] No user/token data in `localStorage`
- [ ] Forms with >2 fields use react-hook-form + zod with a schema in `src/schemas/`
- [ ] Existing `ui/` and `shared/` components reused; new reusable ones accept `className`
- [ ] Tailwind theme tokens only; mobile-first; works in dark mode
- [ ] Loading, empty, and error states handled
- [ ] Sonner for toasts; no second toast system
- [ ] `lint`, `tsc --noEmit`, and tests pass
- [ ] No new dependencies outside §4 without user approval
- [ ] Branch and commit names follow `git-workflow.md`
