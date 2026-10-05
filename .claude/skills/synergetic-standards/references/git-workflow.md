---
title: "Git Workflow & Coding Standards"
description: "Branch naming rules and prefixes, Conventional Commit message format and types, the PR and review process, the development cycle (localhost → PR → staging → production), and post-merge cleanup. Read before creating a branch, writing a commit message, or opening a PR."
---

# Git Workflow & Coding Standards

Rules for branches, commits, pull requests, and the development cycle.

## Main branches

| Branch | Purpose | Stability |
|---|---|---|
| `main` | What is running in **production** | Most stable |
| `staging` | **UAT** — changes under review by testers, QA/QC, and the client before release | Fairly stable |
| `dev` | Development testing | Unstable; can change any time |

Never commit directly to these branches.

**Flow:** `localhost → PR → staging → production (main)`

---

## Branch naming

### Format

```
<prefix>/<issue-number>-<short-description>
```

Example: `feature/123-new-login-system`

### Rules

- **Lowercase only.**
- **Hyphens** separate words.
- **Only** `a-z`, `0-9`, and `-` (plus the single `/` after the prefix). No spaces, underscores, or punctuation.
- **No consecutive hyphens** — ✗ `feature--new-login`
- **No trailing hyphen** — ✗ `feature/new-login-`
- **Descriptive and concise** — reflect the work done.
- **Atomic** — one change per branch.
- **Include the issue number** whenever there is one.
- **Structured** — large tickets get a master feature branch (e.g. `feature/1195-hh-registration`); sub-tickets branch from it.

Validation regex:

```
^(feature|bugfix|hotfix|release|docs|chore|cleanup)\/[a-z0-9]+(-[a-z0-9]+)*$
```

(Release branches may also use dots for versions: `release/v1.0.1`.)

### Prefixes

| Prefix | Use for | Example |
|---|---|---|
| `feature/` | New features | `feature/123-login-system` |
| `bugfix/` | Bug fixes | `bugfix/456-header-styling` |
| `hotfix/` | Critical production fixes — **branch from `main`** | `hotfix/critical-security-issue` |
| `release/` | Preparing a production release | `release/v1.0.1` |
| `docs/` | Writing/updating documentation | `docs/api-endpoints` |
| `chore/` | Work with no direct business value (see below) | `chore/setup-ci-cd` |
| `cleanup/` | Weekly code cleanups, suffixed `yyyy-mmm-ww` | `cleanup/2024-jan-01` |

Always use `feature/` (not `feat/`) for consistency.

**Chores include:** refactoring purely for code quality, proofs of concept, research tasks, dependency updates, increasing test coverage, git orchestration (backporting, preparing release branches), initial project setup (repo, CI, CD pipelines), and localization text updates.

---

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | MUST be used when | SemVer |
|---|---|---|
| `feat` | Adding a new feature | MINOR |
| `fix` | Fixing a bug | PATCH |
| `docs` | Documentation only | — |
| `style` | Formatting only (whitespace, semicolons) — no meaning change | — |
| `refactor` | Code change that neither fixes a bug nor adds a feature | — |
| `perf` | Performance improvements | — |
| `test` | Adding or correcting tests | — |
| `build` | Build system or external dependencies (npm, yarn, docker, nginx) | — |
| `ci` | CI/CD config files and scripts only | — |
| `chore` | Other maintenance | — |
| `revert` | Reverting a previous commit | — |

### Breaking changes (MAJOR)

Indicate with `!` after the type/scope, a `BREAKING CHANGE:` footer, or both. Any type can be breaking.

### Footers

Use git-trailer style, e.g. `Reviewed-by: Z`, `Refs: #123`.

### Examples

```
docs: correct spelling of CHANGELOG
```
```
feat(lang): add Polish language
```
```
feat(api)!: send an email to the customer when a product is shipped
```
```
feat: allow provided config object to extend other configs

BREAKING CHANGE: `extends` key in config file is now used for extending other config files
```
```
chore!: drop support for Node 6

BREAKING CHANGE: use JavaScript features not available in Node 6.
```
```
fix: prevent racing of requests

Introduce a request id and a reference to latest request. Dismiss
incoming responses other than from latest request.

Remove timeouts which were used to mitigate the racing issue but are
obsolete now.

Reviewed-by: Z
Refs: #123
```

### Rules for Claude

- Description in the imperative mood, lowercase, no trailing period ("add login", not "Added login.").
- Keep the subject line under ~72 characters.
- One logical change per commit; don't mix `feat` and `refactor` in one commit.
- Reference the issue in a footer (`Refs: #123`) when one exists.

---

## Development cycle

1. **Branch from the master feature branch** for sub-tickets/sub-issues.
2. **Open PRs into the master feature branch** (e.g. `feature/1195-feature-1`).
3. A **reviewer approves**; **only the maintainer merges to `staging`**.
4. **Delete the branch** after it is merged to staging.
5. If more fixes are needed, **recreate the branch** from the latest base.
6. **Forms:** one developer per form at a time, one ticket per form, to avoid conflicts.

## After a PR is merged

```bash
# Delete the remote branch
git push origin --delete my-fix-branch

# Switch to the main branch
git checkout main

# Delete the local branch
git branch -D my-fix-branch

# Update local main with upstream
git pull --ff origin main
```
