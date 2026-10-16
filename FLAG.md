# Flags

Known gaps and deliberate scope cuts from the account/notifications/error-handling work (navbar account dropdown, profile page, notification centre, toast system, 403/404 screens).

## Error handling / auth

- Only the project overview page (`/projects/:id`) renders the 403/404 `SystemStateScreen`. The ~8 sibling project sub-pages (team, schedule, risks, stages, change-requests, milestones, weekly-submission) call `useProjectDetail` too but don't guard against a failed/missing project at all today (pre-existing gap, not introduced by this work) — they'll need the same treatment, and some may need null-safety fixes to `project` usage first.
- The toast auto-dismisses after 6s with no queue cap or dedupe. Fine at current volume; revisit if a page can burst many errors at once.
- The backend reuses HTTP 403 for both "invalid/expired token" and "role not authorized" (see `authenticateToken` and `authorize` middleware). The frontend distinguishes them by exact-matching the response `message` string (`lib/api-client.ts`'s `TOKEN_ERROR_MESSAGES`). This is brittle — if those backend message strings ever change, token-expiry will silently stop triggering auto-logout and start showing a toast instead.
- `contexts/auth-context.tsx` and `lib/api-client.ts` store the access/refresh tokens in `localStorage`, which conflicts with the Synergetic standard of httpOnly-cookie-only sessions. Pre-existing, not touched.

## Profile page

- "Edit profile," the avatar camera button, and "Manage →" (Microsoft) are visual-only — no backend endpoints exist for them.
- "Granted by," "Since," and "Member since" show `—` — `RoleGrant` and the login payload don't carry that data today.
- "Notification preferences" link works, but there's no backend-driven email/notification settings beyond what the notification centre already covers.

## Notification centre

- PDF attachment chips shown in two Figma notification cards aren't rendered — no real file/attachment data exists on the `notification` payload; rather than fake a download link they're omitted.
- "Unaddressed" / "In review" pills are derived purely from `type_code`, not a dedicated status field (the schema doesn't have one). Works for the two cases Figma shows; won't generalize if more statused types are added.
- Email delivery (the `notification_delivery` table and `email` channel in preferences) is unwired — only `in_app` preferences are editable from the UI.

## Unrelated pre-existing issue noticed

- `bun run seed` (backend) fails on `13_milestones_and_attention.ts` with a `ck_activity_completed_at` check-constraint violation — looks like stale seed dates vs. the current server date. Not touched; seeding `00_reference_data.ts` and `11_notifications_audit_tokens.ts` individually works fine.
