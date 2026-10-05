---
name: synergetic-standards
description: "Synergetic's engineering standards for stack selection, git workflow and React frontend development. Use this skill whenever working on any Synergetic project: starting or scaffolding a project, choosing a framework, library, database, auth provider, host or service, adding a dependency, writing or reviewing frontend or backend code, creating React components, pages, routes, forms, hooks or API calls, setting up auth or protected routes, writing Knex migrations, configuring CI/CD, deploying, naming a branch, writing a commit message, or opening a PR. Use it even when the user doesn't mention standards, conventions or guidelines explicitly."
---

# Synergetic Engineering Standards

This skill holds the rules for building software at Synergetic. The rules are split into three reference files. Read the one(s) that match the task **before** writing code, adding dependencies, creating branches or committing.

## Which reference to read

| If the task involves… | Read |
|---|---|
| Starting a project, picking a technology, adding a dependency or service, hosting, database, auth provider, file storage, CI/CD, monitoring, DNS | [`references/tech-stack.md`](references/tech-stack.md) |
| Creating a branch, writing a commit message, opening/merging a PR, release or hotfix flow | [`references/git-workflow.md`](references/git-workflow.md) |
| Any React/frontend code: folder structure, components, styling, data fetching, auth wrappers, routing, forms, errors, tests, frontend deployment | [`references/react-guidelines.md`](references/react-guidelines.md) |

Most coding tasks need **two** files: the domain guide (e.g. `react-guidelines.md`) plus `git-workflow.md` for the branch and commits. When a new dependency or service is involved, also read `tech-stack.md`.

`react-guidelines.md` is long. Use its **Contents** list to jump to the relevant section rather than reading it end-to-end, but always read its **Core rules** and **Pre-PR checklist**.

## Non-negotiable rules

These apply to every task, even if no reference file is read:

1. **Approved stack by default.** Don't introduce a framework, database, auth provider, host, or major library outside `tech-stack.md` without telling the user why the default doesn't fit and getting confirmation.
2. **TypeScript everywhere.** Frontend and backend.
3. **Relational DB + Knex migrations.** PostgreSQL preferred, MySQL acceptable. No manual schema changes.
4. **Frontend reads use `useQuery`, writes use `useMutation`, and all HTTP goes through the shared `api()` client.**
5. **Protected pages sit behind `ProtectedRoute`.** The backend still enforces auth on every endpoint.
6. **Never store users or tokens in `localStorage`.** Better Auth's httpOnly cookie holds the session.
7. **Branches:** `<prefix>/<issue>-<description>`, lowercase, hyphens only (e.g. `feature/123-new-login-system`).
8. **Commits:** Conventional Commits, in the form `<type>[scope]: <description>` (e.g. `feat(auth): add google sign-in`).
9. **No direct commits to `main`, `staging` or `dev`.** Only the maintainer merges to `staging`, after reviewer approval.
10. **One branch, one change.**

## Workflow

1. **Identify the task type** and read the matching reference(s) from the table above.
2. **Check the existing repo.** If the project already follows these standards, match it. If it deviates, don't silently "fix" unrelated code; propose a `chore/` or `refactor/` change instead.
3. **Propose the branch name** before making changes, following `git-workflow.md`.
4. **Implement** following the reference rules.
5. **Run the relevant checklist:** the Pre-PR checklist in `react-guidelines.md` for frontend work, and the New project checklist in `tech-stack.md` for new projects.
6. **Suggest commit messages** in Conventional Commits format, one logical change per commit.

## Handling conflicts and gaps

- If a user request conflicts with these standards, **say so before proceeding**. State the rule, the conflict, and your recommendation. Then follow the user's decision.
- If the standards don't cover something, prefer the option most consistent with the existing stack, and flag the choice to the user.
- Priority when sources disagree: **explicit user instruction > these references > patterns in the existing repo > general best practice.**
