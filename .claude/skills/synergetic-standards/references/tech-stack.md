---
title: "Development Stack Selection"
description: "Approved default technologies for every layer of a Synergetic project: frontend, backend, auth, file storage, database, hosting, CI/CD, monitoring, DNS and version control. Includes the process for proposing deviations and a new-project checklist. Read before starting a project, adding a dependency, or choosing a service."
---

# Development Stack Selection

The approved default stack for Synergetic projects. Use these choices unless the user explicitly approves a deviation.

## Decision process for Claude

Before adding any technology:

1. **Check this document.** If a default exists for the layer, use it.
2. **If the default doesn't fit**, explain the gap to the user and propose an alternative with trade-offs. Do not install it until confirmed.
3. **Check hosting compatibility.** Everything must run on the current DirectAdmin/VPS setup (Node app + statically served frontend) unless the user approves otherwise.
4. **Prefer what's already paid for** (e.g. Microsoft 365 / SharePoint) over new paid services.

---

## Frontend

| Concern | Default |
|---|---|
| Framework | React with **TypeScript** |
| Build tool | **Vite** |
| Server state / data fetching | **TanStack Query** — use it for all cached reads from the API |
| App-like experience | **PWA** (e.g. `vite-plugin-pwa`) — only when installability/offline is required |
| Offline storage | **IndexedDB** (or another browser DB such as Dexie/RxDB) |
| Styling / UI | **Tailwind CSS** + **shadcn/ui**, `lucide-react` icons |
| Routing | **React Router v6** with `ProtectedRoute` auth wrapper |
| Forms | **react-hook-form** + **zod** |
| Toasts | **Sonner** |
| Testing | **Vitest** + Testing Library |
| Package manager | **Bun** |
| Structure & patterns | See `react-guidelines.md` |

**React vs Next.js:** Default to **React + Vite** (a static SPA build served by the web server fits the current hosting). Use **Next.js** only when server-side rendering, SEO-critical pages, or server components are genuinely needed — and confirm with the user first, since it requires a running Node process for the frontend and does not use Vite.

### Offline pattern

When offline support is required:

- Store pending writes in an IndexedDB **queue** while offline.
- **Replay** the queue in order when connectivity returns.
- Make write endpoints **idempotent** (e.g. client-generated IDs) so replays don't create duplicates.
- Surface sync status to the user (pending / synced / failed).

## Backend

| Concern | Default |
|---|---|
| Runtime / framework | **Node.js + Express** with **TypeScript** |
| Query builder | **Knex** |
| Process manager | **PM2** |

**Why Knex:**
- **Migrations** give version control over the database structure — every schema change is a migration file committed to the repo.
- **Portability** between relational databases (e.g. MySQL → PostgreSQL) without rewriting queries.
- Used for all application database interactions.

Rules:
- Never modify schema manually in production or staging; write a migration.
- Every migration must have a working `down` (rollback).
- Seed data goes in Knex seed files, not migrations.

## Authentication

- **Better Auth** — supports email/password and social sign-in.
- Do not hand-roll auth (password hashing, sessions, tokens) when Better Auth covers the need.

## File storage

- **Microsoft SharePoint** (included in the existing Microsoft 365 package).
- Capacity: ~1 TB organisation storage plus 10 GB per user.
- Access via Microsoft Graph API. Do not add S3, Cloudinary, etc. without approval.
- Do not store uploaded files on the application server's disk except as temporary buffers.

## Database

- **Relational by default.** **PostgreSQL preferred**; **MySQL acceptable**.
- **Non-relational** (e.g. MongoDB, Redis) only on a demonstrated need — justify it to the user first.
- Access only through Knex.

## Hosting & deployment

- **VPS preferred.**
- The current **DirectAdmin-managed HostPinnacle** hosting is sufficient:
  - Hosts the Node/Express backend.
  - React frontends are built (`vite build`) and served as static files by the web server.
- **Uptime:** the Node service runs under PM2. A **cron job** runs a shell script that checks whether the PM2 process is up and restarts it if not.

## CI/CD

- **GitHub Actions** for lint, type-check, test, build, and deploy.
- Pipeline changes use the `ci:` commit type and a `chore/` branch (see `git-workflow.md`).

## Monitoring & alerts

| Need | Tool |
|---|---|
| Simple HTTPS / uptime checks | **Uptime Kuma** |
| Metrics collection | **Prometheus** |
| Dashboards | **Grafana** |
| Alert delivery | **Discord** or **MS Teams** |

Backends should expose a `/health` endpoint for uptime checks.

## DNS

- **Cloudflare**.

## Version control

- **GitHub**. See `git-workflow.md` for branching and commit standards.

---

## New project checklist

- [ ] React + TypeScript + Vite frontend scaffolded per `react-guidelines.md`
- [ ] TanStack Query configured
- [ ] PWA + IndexedDB added only if offline/app-like is a requirement
- [ ] Node + Express + TypeScript backend
- [ ] Knex configured with migrations and seeds directories
- [ ] PostgreSQL (or MySQL) database
- [ ] Better Auth integrated
- [ ] SharePoint integration (if file storage needed)
- [ ] PM2 config + cron health-check script
- [ ] GitHub Actions workflow
- [ ] `/health` endpoint + Uptime Kuma monitor + alert channel
- [ ] Cloudflare DNS records
- [ ] `main`, `staging`, `dev` branches created
