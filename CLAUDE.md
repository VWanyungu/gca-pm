---
title: "Synergetic Project Instructions"
description: "Entry point for Claude in Synergetic repositories. Points to the synergetic-standards skill, which holds the stack, git workflow and React frontend rules."
---

# CLAUDE.md: Synergetic Project Instructions

This repository follows Synergetic's engineering standards. They live in the **`synergetic-standards`** skill:

```
.claude/skills/synergetic-standards/
├── SKILL.md                     # Start here: which reference to read, and the core rules
└── references/
    ├── tech-stack.md            # Stack selection
    ├── git-workflow.md          # Branches, commits, PRs
    └── react-guidelines.md      # React frontend patterns
```

**Before any code change, branch, commit or dependency addition, read `.claude/skills/synergetic-standards/SKILL.md`** and the reference files it points to.

## Quick reference

- **Frontend:** React + TypeScript + Vite, Tailwind + shadcn/ui, TanStack Query (`useQuery` / `useMutation`), React Router with `ProtectedRoute`, react-hook-form + zod, Sonner, Bun
- **Backend:** Node + Express + TypeScript, Knex migrations
- **Auth:** Better Auth · **Files:** SharePoint · **DB:** PostgreSQL (or MySQL)
- **Hosting:** VPS / DirectAdmin (HostPinnacle), PM2 · **CI/CD:** GitHub Actions
- **Monitoring:** Uptime Kuma, Prometheus, Grafana → Discord / MS Teams · **DNS:** Cloudflare
- **Branches:** `feature/123-short-description` · **Commits:** `feat(scope): description`

## Project-specific notes

<!-- Add anything specific to this repo: local setup commands, env vars, domain terms, known quirks. -->
