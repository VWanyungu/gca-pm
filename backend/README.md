# GCA Backend

Express + Knex (Postgres) + Upstash Redis, versioned via `api-v` header. Scaffold mirrors [idealb](../../ref/idealb/README.md).

## Setup

```bash
cp .envExample .env   # fill in values
bun install
bun run migrate
bun run dev           # bun --watch
bun run typecheck     # tsc --noEmit
```

TypeScript everywhere, run natively with `bun` (no build step for dev). `bun run build` emits to `dist/` via `tsc`.

All versioned requests need the header `api-v: v1`. `GET /health` is unversioned.

## Structure

```
middlewares/
  version.js            # routes by api-v header
v1/
  database/
    utils/              # Cache, Users, Tokens
    cacheSetup.js       # Upstash
    dbSetup.js          # Knex
  middlewares/
    token.js            # JWT + blacklist check
  migrations/           # knex-managed
  routers/              # one per endpoint group
  utils/                # jwt, hash, mail, validation, cache check
  seeds/
  tests/
  index.js              # mounts v1 routes
index.js                # app bootstrap (helmet, cors, morgan, error handler)
knexfile.js
```

## Response shape

```json
{ "status": "success|fail|error", "data": {...} | null, "message": "..." }
```

Status codes: 200 success · 400 input · 401 auth · 403 forbidden · 404 not found · 500 server.

## Auth flow

See [idealb README](../../ref/idealb/README.md) — login/logout/forgot-password/reset-password/token work identically here.

## Deviations from idealb

- Fixed: missing `jwt` import in refreshTokenRouter; undefined `admin` in usersRouter; empty signUpRouter; `Cache.set` signature; `.js` extensions on all ESM imports; `midlewares/` → `middlewares/`.
- Added: helmet, cors, morgan, central error handler, refresh token storage on login.
- Everything else is intentionally the same.
