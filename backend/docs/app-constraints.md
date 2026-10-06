# Application-Enforced Constraints — GCA PDM Platform

**Companion to:** SRS v0.6 (Chapter 15 data model) and `db-sanity-checklist.md`
**Database:** PostgreSQL 13+
**Purpose:** This file lists every business rule that the **database cannot enforce on its own** and that application code (main app, Java schedule microservice, scheduled jobs) must implement. If a rule is already guaranteed by a key, check constraint, partial unique index or trigger, it is listed in `db-sanity-checklist.md` instead, and appears here only where the application must handle the resulting error gracefully.

## How to use this file

- Each rule has a stable ID (`AC-<AREA>-NN`) so code, tests and reviews can reference it.
- **Where** says which component owns the rule: `API` (main application service layer), `SCH` (Java schedule microservice), `JOB` (scheduled background job), `UI` (client-side convenience only, never the sole enforcement).
- **On failure** says what the user or caller sees. Unless stated otherwise, a violated rule returns a validation error with a human-readable message (NFR-OPS-02) and changes nothing.
- Status labels: **[P]** = provisional default pending an open question in SRS §23. Implement it, but keep it isolated and easy to change.
- Table and column names match SRS §15.2 exactly.

---

## 1. Cross-cutting rules

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-GEN-01 | **Audit every state change.** Every state-changing action writes one or more `audit_event` rows **in the same database transaction** as the change, with `actor_id`, `acting_attribute_id`, `channel`, `correlation_id`, `project_id` (when applicable), `entity_type`, `entity_id`, `action`, `before_json`, `after_json`, and `reason` where the action requires one. | API, SCH, JOB | Triggers cannot know the actor, attribute or reason, so this is application work. If the audit insert fails, the whole transaction fails. Covers everything listed in FR-M17-001. |
| AC-GEN-02 | **One correlation ID per request/transaction.** Generate a UUID per inbound request (or job run step) and use it on every audit event and notification written in that unit of work. | API, SCH, JOB | Lets auditors see e.g. a weekly approval with its risk, stage and escalation side effects as one action. |
| AC-GEN-03 | **`entity_type` and `action` come from a single code registry** (constants), never free strings at call sites. Actions are namespaced: `project.create`, `stage.activate`, `dpr.submit`, `schedule.writeback`, `escalation.acknowledge`, etc. | API, SCH, JOB | The DB stores them as text so the list can grow without migrations. |
| AC-GEN-04 | **Authorisation on every request (ABAC).** Grant access if **any** active attribute (`revoked_at IS NULL`) of the user permits the action on the target. Scope matching: `global` covers everything; `program:X` covers projects whose `program_id = X`; `project:X` covers project X. Deactivated users (`app_user.status = 'deactivated'`) are denied everything. | API | Server-side always (NFR-SEC-03). Use the §16 matrix. Record the attribute that granted access in `acting_attribute_id`. |
| AC-GEN-05 | **Attribute revocation takes effect on the next request** (403 plus session-ended message). Do not cache authorisation decisions across requests. | API | §20. |
| AC-GEN-06 | **Project-local time.** All deadlines and calendar dates are evaluated in `project.timezone` (IANA). This includes: DPR `report_date` and 23:00 deadline, same-day edit window, weekly `week_start` and Monday 09:00 deadline, "today" for overdue detection, metrics `as_of_date`, expected-DPR-day calculation, and per-project scheduled jobs. | API, SCH, JOB | Store instants as `timestamptz`; convert with the project's zone. Never use server-local time. |
| AC-GEN-07 | **System actor.** Automated actions (overdue sweep, auto-resolve, metrics, purges, notification jobs) run as the seeded `system` user with `acting_attribute_id = NULL` and `channel = 'scheduled_job'` or `'schedule_service'`. | SCH, JOB | |
| AC-GEN-08 | **Soft-deleted rows are invisible.** Every read path filters `deleted_at IS NULL` (and `removed_at IS NULL` where that column is used) except Admin restore screens. Restoring clears the column. A purge job hard-deletes after 90 days (§9 jobs). | API, JOB | Applies to: project, dpr, schedule_version, risk_issue, file_object, custom_milestone, stage_activity_attachment, dpr_activity_progress. |
| AC-GEN-09 | **Cancelled projects are read-only.** Reject every write to a project with `status = 'cancelled'` and to any of its child entities, except Admin reinstatement (AC-PRJ-04) and system jobs that close things out. | API | §20. |
| AC-GEN-10 | **Same-project references without a composite FK.** Where the schema could not tie a reference to the same project, check it in code: `dpr_activity_progress.task_id` (task's project = DPR's project), `dpr_personnel_group.project_contractor_id` (contractor link's project = DPR's project), `submission_client_photo.photo_id` (photo's DPR project = submission's project), every file link (file's `project_id` = owner's project), `weekly_submission.top_risk_id` (risk's project = submission's project), `schedule_version.change_request_id` (CR's project = version's project). | API, SCH | Reject with a validation error. |
| AC-GEN-11 | **Translate constraint violations into friendly errors.** Map known unique/check/FK violation names (see `db-sanity-checklist.md`) to user messages, e.g. `ux_dpr_project_date` → "A DPR already exists for this date" with a link to it. | API | Never surface raw database errors (NFR-OPS-02). |
| AC-GEN-12 | **Optimistic concurrency on editable drafts.** Draft DPRs, draft weekly submissions, stage activities and checklist responses are saved with an `updated_at` check (reject if the row changed since it was loaded) so two tabs or devices cannot silently overwrite each other. | API | |

---

## 2. Identity, access and administration

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-IAM-01 | Only users with `Admin@global` may create, modify, deactivate or reactivate users and grant or revoke attributes (FR-M01-003). Exception: project assignments made by the project's PM (AC-IAM-04) and the automatic creator grant (AC-PRJ-02). | API | |
| AC-IAM-02 | Attributes are **revoked, never deleted**: set `revoked_by`, `revoked_at`, `revoke_reason`. Re-granting creates a new row. | API | Keeps assignment history. |
| AC-IAM-03 | `ProjectCreator`, `ExCo` and `Admin` may only be granted at `global` scope. | API | Also a DB check; validate first for a clean message. |
| AC-IAM-04 | **Assignment = grant.** Assigning a Planner or Site Engineer to a project grants `Planner@project:X` / `SiteEngineer@project:X`; unassigning revokes it. The PM of the project (or Admin) performs these. | API | §16 "Assign Planner / Site Engineer". |
| AC-IAM-05 | **Exactly one PM per project (BR-02).** The DB allows at most one active `PM@project:X`. The application guarantees at least one: PM reassignment (Admin only, reason required — FR-M02-005) revokes the old grant and grants the new one **in one transaction**; revoking the only PM without a replacement is rejected. | API | |
| AC-IAM-06 | **Site Engineer and Stage 7 (BR-04).** The DB allows at most one active `SiteEngineer@project:X`. **[P]** (OQ-RP-05): activating Stage 7 on a project with no active Site Engineer is allowed but raises a persistent warning on the PM home and project header; revoking the Site Engineer while Stage 7 is active requires a replacement in the same transaction. | API | Switch to a hard block if OQ-RP-05 says so. |
| AC-IAM-07 | Deactivating a user does not revoke their attributes automatically, but AC-GEN-04 denies all access. Admin is warned if the user is the PM or Site Engineer of any active project. | API | |
| AC-IAM-08 | Admin may merge duplicate contractors by setting `contractor.merged_into_id`. The target must not itself be merged (no chains). Merged contractors are hidden from pickers; reports resolve to the target. Historical rows are never rewritten. | API | |
| AC-IAM-09 | Reference data (personnel roles, weather categories, risk categories, holiday calendars, checklist templates) is deactivated, not deleted, once used. Categories with `risk_category.is_system = true` cannot be renamed (code), deactivated or deleted. | API | |

---

## 3. Project setup and status

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-PRJ-01 | Creating a project requires `ProjectCreator@global` (or `Admin@global`). | API | |
| AC-PRJ-02 | **Create transaction.** In one transaction: insert `project` (status `active` — BR-10); grant `PM@project` to the creator (or to the PM chosen by an Admin); insert one `project_stage` row per declared scope stage (`in_scope = true`, `state = 'not_started'`) with an `added_to_scope` history event each; then activate the initial stages (`activated` events); insert client contacts, team members and Planner grants; write `project_status_history` (null → active). | API | |
| AC-PRJ-03 | **Create validations.** Required fields per FR-M02-001. Scope must contain at least one stage. Initial active stages ⊆ scope and non-empty. `project_code` matches `NNN-NNN.YYYY` (BR-15) — auto-suggest the next code, user may edit. `timezone` must be a valid IANA zone (default `Africa/Nairobi`). `holiday_calendar_id` defaults to the active calendar for the project's country if one exists. `expected_end_date ≥ expected_start_date`. | API | |
| AC-PRJ-04 | **Status transitions** (§8.4, FR-M03-006). Allowed: active → on_hold (reason required); on_hold → active; active → complete; active or on_hold → cancelled (reason required); cancelled → active (**Admin only**, reason required — BR-20). Anything else is rejected. Every transition writes `project_status_history` and an audit event. | API | |
| AC-PRJ-05 | **On cancellation**, in the same transaction: set every open escalation of the project to `voided` with `void_reason = 'project cancelled'` **[P]** (OQ-FN-12); after that the project is read-only (AC-GEN-09). Pending change requests and DPR amendments stay as they are. | API | |
| AC-PRJ-06 | **On-hold exclusion (BR-12).** RAG rollups for a PM, program or portfolio exclude projects that are on hold. For historical/trend views, use the hold intervals from `project_status_history`. | API | |
| AC-PRJ-07 | **Scope edits (FR-M02-006).** Adding a stage: insert `project_stage` (or set `in_scope = true` on an existing row) plus an `added_to_scope` event. Removing a stage: allowed only when its state is `not_started` or `complete` **and** it has no `stage_activity` with status `open` or `in_progress`; set `in_scope = false` plus a `removed_from_scope` event. Rows are never deleted. | API | |
| AC-PRJ-08 | Metadata edits (FR-M02-004) are audited with before/after. Changing `timezone` does not recompute stored late flags (they are fixed at the time they were set). | API | |
| AC-PRJ-09 | At most one `project_team_member` per project has `is_team_lead = true` (DB). Changing the team lead clears the old one and sets the new one in one transaction. | API | |
| AC-PRJ-10 | Legacy import (BR-17) uses the same create transaction as AC-PRJ-02, with `legacy_source_ref` set and the stage mapping from OQ-BP-02. | JOB | |

---

## 4. Stages, checklists and activities

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-STG-01 | **Allowed stage transitions** (only for `in_scope = true` stages): not_started → active; active → inactive (deactivate); inactive → active; not_started / active / inactive → complete; complete → active (reopen). Everything else is rejected. PM on the project or Admin only. | API | The DB additionally blocks `active` when `in_scope = false`. |
| AC-STG-02 | Every transition updates `project_stage.state`, `last_changed_by`, `last_changed_at` **and** inserts one `stage_state_history` row (`event`, `from_state`, `to_state`, optional `reason`, `submission_id` when caused by a weekly approval) in one transaction. History rows are never updated or deleted. | API | |
| AC-STG-03 | Activating a stage that is not in scope returns "Edit the project scope first" (FR-M03-001). | API | |
| AC-STG-04 | **Completion.** Build `checklist_snapshot` from the stage's current template items plus the project's live responses: `[{item_id, text, sort_order, is_checked, note}]` plus `template_id` and `version_no`. Store it with optional `closure_notes` on the `completed` event. Completion is **never** blocked by unticked items (FR-M03-003). If no template exists, store `{"template_id": null, "items": []}`. | API | The DB requires a snapshot on completion events. |
| AC-STG-05 | **Reopen** sets the stage back to `active` and writes a `reopened` event. **[P]** (OQ-FN-08): live checklist responses are preserved. To switch to "reset", delete the stage's `project_stage_checklist_response` rows in the same transaction. | API | |
| AC-STG-06 | **Checklist templates.** Admin creates a new version (`version_no` = previous + 1) with its items, then publishes it by setting `is_current = true` and clearing the previous current flag in one transaction. Items of a published version are never edited or deleted. **[P]** (OQ-FN-11): the stage view always shows the current version; responses to items not in the current version are ignored on screen and excluded from the completion snapshot. | API | |
| AC-STG-07 | Checklist responses can only be saved for items of the **current** template of that stage, and only while the stage is in scope and not complete. | API | |
| AC-STG-08 | **Stage activities.** Created by the PM (or Admin), tagged automatically to the stage view they were created from (FR-M03-005). Re-tagging is allowed only to a stage that is `in_scope = true` on the same project. `completed_at` is set when status becomes `done` and cleared if it leaves `done` (the DB checks consistency). Site Engineers have view access only. | API | |
| AC-STG-09 | **Activity attachments.** Attach only `file_object` rows with `purpose = 'activity_attachment'`, `variant = 'original'`, `status = 'available'`, same project. **[P]** limits: same as DPR photos for images (10 MB) and 25 MB for other documents, maximum 20 attachments per activity. Removal is a soft remove (`removed_by`, `removed_at`). | API | SRS sets no limits for activities; confirm. |
| AC-STG-10 | **Primary stage** for sorting (OQ-BP-06) **[P]**: the highest-numbered active stage. | API | |

---

## 5. Schedule (Java microservice and main app)

### 5.1 Upload lifecycle

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-SCH-01 | Upload requires `Planner@project:X` (or Admin). The main app stores the file (`file_object`, purpose `schedule_mpp`), waits for it to pass scanning, then inserts `schedule_version` with `status = 'queued'`. If another upload for the project is `queued` or `parsing`, the DB rejects it; show "An upload for this project is still being processed". | API | |
| AC-SCH-02 | **Upload kind.** The first applied upload of a project must be `initial_baseline` (default the kind automatically when no applied version exists). Later uploads are `regular` unless the Planner chooses `rebaseline`, which requires a `change_request_id` of the same project with `status = 'approved'`. | API | DB guarantees one applied initial baseline and that rebaselines carry a CR. |
| AC-SCH-03 | **Duplicate file warning.** If `file_sha256` equals the latest applied version's hash, warn the Planner ("identical to version N") but allow it. | API | |
| AC-SCH-04 | **Processing is all-or-nothing.** The service sets `status = 'parsing'`, parses, and on any parse error sets `status = 'failed'` with task-level `parse_diagnostics` and writes nothing else (FR-M05-002). On success, everything in AC-SCH-05 to AC-SCH-12 happens in **one transaction** that ends with `status = 'applied'`, `version_no = max(version_no) + 1`, `applied_at = now()` and the change summary counts. | SCH | Take a row lock on the project's `schedule_version` set (or `pg_advisory_xact_lock(project)`) for the duration. |
| AC-SCH-05 | **Matching.** Match parsed tasks to `schedule_task` by `(project_id, mpp_unique_id)`. Skip the MS Project project-summary row (UniqueID 0). | SCH | |
| AC-SCH-06 | **New tasks:** insert `schedule_task` (`first_seen_version_id` = this version) and a revision with `change_type = 'added'`. **Changed tasks:** if any stored field differs from the current revision, close the current revision (`valid_to = now()`) and insert a new one with `change_type = 'modified'`. **Unchanged tasks:** write nothing. **Missing tasks:** set `removed_in_version_id`, close the current revision. **Reappearing removed tasks:** clear `removed_in_version_id`, insert a revision with `change_type = 'restored'`. | SCH | "Stored fields" = every column of the revision except ids, source and validity. `parent_task_id` resolves from the parent's UniqueID. |
| AC-SCH-07 | All tasks are stored regardless of `scope_mode`; `scope_mode` is saved on the version and used only as a display filter (milestones only = `is_milestone`; top-level phases = `outline_level = 1`; every task = all). | SCH, API | |
| AC-SCH-08 | **Conflict detection (FR-M06-013).** For each task whose current revision has `source = 'dpr_writeback'` and whose uploaded `pct_work_complete` differs from it: apply the upload (Planner wins) and insert `schedule_reconciliation_flag` (`overwritten_revision_id` = the write-back revision, `overwriting_revision_id` = the new upload revision). If the values are equal there is no conflict and no flag. `pct_overwrites` = number of flags created. | SCH | |
| AC-SCH-09 | Store `status_date` from the file's Status Date when present. | SCH | |
| AC-SCH-10 | **Overdue detection on upload** (AC-SCH-20) runs inside the same transaction after the task changes; `overdue_risks_created` = number of new auto risks. | SCH | |
| AC-SCH-11 | **Metrics refresh** (AC-SCH-30) for today runs after the task changes. | SCH | |
| AC-SCH-12 | **After commit**, enqueue notifications: first upload → `schedule.first_upload` (PM, ExCo digest); every upload → `schedule.version_uploaded` with the change summary (PM); new overdue risks → `schedule.overdue_risks_created` (PM); `pct_overwrites > 0` → `schedule.writeback_overwritten` (PM). | SCH, API | §17.1. |

### 5.2 Write-backs

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-SCH-15 | **Write-back revision.** For a DPR activity row with `source = 'schedule_task'`: lock the task's current revision, close it, insert a copy with `pct_work_complete = total_pct`, `source = 'dpr_writeback'`, `dpr_activity_progress_id` = the row, `change_type = 'modified'`, `schedule_version_id` = the current revision's version. If `total_pct` equals the current value, write nothing. | API | Triggered by DPR submit, same-day edits and approved amendments (AC-DPR-08, AC-DPR-14). |
| AC-SCH-16 | **Stale write-back rule.** A write-back from a same-day edit or an amendment is applied **only if no `schedule_version` of the project has been applied after the DPR's original `submitted_at`**. Otherwise skip it (for amendments set `writeback_outcome = 'skipped_stale_schedule'`) and tell the PM. The initial submit always writes back. | API | Decision from the DB design pass. |
| AC-SCH-17 | Every write-back writes an audit event `schedule.writeback` with `before` / `after` % and the DPR reference (FR-M06-013), then refreshes today's metrics (AC-SCH-30). | API | |

### 5.3 Overdue risks

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-SCH-20 | **Overdue definition.** A task is overdue when: its current revision exists; `schedule_task.removed_in_version_id IS NULL`; `is_summary = false`; the project-local date of `expected_finish` is before today (project-local); `pct_work_complete < 100`. | SCH, JOB | Summary tasks never generate risks (decision). |
| AC-SCH-21 | **Create.** For each overdue task without an open auto risk: insert `risk_issue` with `kind = 'risk'`, `source = 'auto_overdue_task'`, `source_task_id`, `source_schedule_version_id` (the version in effect), title `Overdue task: <task name>`, category `schedule_slippage`, likelihood 3, impact 3, owner = the project's PM, `status = 'open'`, `addressed_at = NULL`, `stage_no = NULL` **[P]** (OQ-FN-09), `created_by = system`. The DB's partial unique index prevents duplicates; treat a unique violation as "already exists". | SCH, JOB | |
| AC-SCH-22 | **Do not store** days overdue or % complete on the risk; compute them at display from the current revision (`today − expected_finish`, `pct_work_complete`). | API | |
| AC-SCH-23 | **Auto-resolve.** For each open auto risk whose task is no longer overdue: set `status = 'auto_resolved'`, `closed_at = now()` and `auto_resolution_reason` = `task_removed` if the task is removed, else `task_completed` if `pct_work_complete = 100`, else `rescheduled`. | SCH, JOB | |
| AC-SCH-24 | Auto risks: PM may change likelihood, impact, owner, mitigation, stage tag and status (address / dismiss). Title, source fields and kind are read-only. They can never be converted to issues. | API | |

### 5.4 Metrics

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-SCH-30 | **Snapshot upsert.** Upsert `project_metrics_snapshot` for `(project_id, today local)` with `schedule_version_id` = latest applied version, `computed_at = now()`. Skip projects with no applied schedule (KPIs show "no schedule" — FR-M02-003). | SCH, API, JOB | |
| AC-SCH-31 | **Qualifying tasks:** current revisions, task not removed, `is_summary = false`. Weight `w_i = duration_minutes`. | SCH, API, JOB | Milestones have duration 0 and drop out. |
| AC-SCH-32 | **Actual %** = `Σ(w_i × pct_work_complete_i) / Σ w_i`. **Planned %** = `Σ(w_i × planned_i(d)) / Σ w_i`, where `planned_i(d)` = 0 before the task's planned start, 100 after its planned finish, and linear in calendar time between. Planned window = `baseline_start → baseline_finish`, or `start → expected_finish` when no baseline. If `Σ w_i = 0`, both are null. Round to 2 d.p. | SCH, API, JOB | Do **not** use the parsed `planned_pct_complete` or the `.mpp` summary row. |
| AC-SCH-33 | **SPI** = Actual ÷ Planned (2 d.p.); null when Planned is 0 or null. **RAG** from SPI per BR-05 (thresholds in configuration, not code: ≥ 0.95 green; ≥ 0.80 amber; else red); null when SPI is null. | SCH, API, JOB | OQ-FN-01 may change thresholds. |
| AC-SCH-34 | `baseline_finish` = latest `baseline_finish` among qualifying tasks; `forecast_finish` = latest `expected_finish` among qualifying tasks (as project-local dates). | SCH, API, JOB | Feeds FORECAST END. |

### 5.5 Milestones and flags

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-SCH-40 | Custom milestones: PM (or Admin) creates, edits and soft-removes them; stage tag must be an in-scope stage of the project. Schedule milestones (from the view) are read-only to everyone (FR-M05-010). | API | |
| AC-SCH-41 | Reconciliation flags are acknowledged by the project's PM (or Admin) with one click: set `acknowledged_by`, `acknowledged_at`; audited. Flags are never deleted. | API | |
| AC-SCH-42 | Schedule history (FR-M05-009): list applied versions with uploader and date; failed uploads are visible to Planners/PM with diagnostics; any applied version's original file can be downloaded. | API | |

---

## 6. Daily Progress Reports

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-DPR-01 | Create/edit/submit requires `SiteEngineer@project:X`. Drafts are visible only to their author (and Admin); PMs see DPRs only once submitted (FR-M06-003). | API | |
| AC-DPR-02 | **Stage.** `stage_no` must be 7, 8 or 10, in scope, and `active` on `report_date` (use the current state when `report_date` is today). Default to 7 when it is active. | API | Stage-to-surface mapping lives in code by design. |
| AC-DPR-03 | `report_date` must not be in the future (project-local). | API | |
| AC-DPR-04 | One DPR per project per date, drafts included (DB unique). On conflict return a link to the existing DPR. | API | |
| AC-DPR-05 | **Submit transaction.** Validate (AC-DPR-06 to AC-DPR-10), then: set `status = 'submitted'`, `submitted_by`, `submitted_at = now()`; allocate `dpr_seq` = max for project + 1 (row-lock the project or use an advisory lock); generate `dpr_ref` **[P]** `DPR-{YYMMDD}-{PPP}-{NNN}` (OQ-FN-10; PPP = project short number, NNN = `dpr_seq` zero-padded); set `is_late = submitted_at > report_date 23:00 project-local` (BR-06); perform write-backs (AC-SCH-15); audit `dpr.submit`. | API | |
| AC-DPR-06 | **Activity progress rows.** For `source = 'schedule_task'`, the task must belong to the project, have a current revision, be non-summary and not removed; otherwise block submit and ask the engineer to re-pick or switch to free text (§20). Each task at most once per DPR (DB). `0 ≤ today_pct ≤ total_pct ≤ 100` (DB). | API | Task picker lists only current, non-summary, non-removed tasks. |
| AC-DPR-07 | **Personnel.** For each group, the sum of `dpr_personnel_role_count.headcount` must be ≤ `total_headcount`. The `project_contractor` must belong to the project and be active when first added to the DPR. | API | |
| AC-DPR-08 | **Same-day edit window.** After submit, the author may edit directly until the end of the local calendar day **of submission** **[P]** (OQ-FN-14). Each edit is audited with before/after. Changed `total_pct` on schedule rows triggers write-backs subject to the stale rule (AC-SCH-16). `dpr_ref`, `submitted_at` and `is_late` never change. | API | |
| AC-DPR-09 | **Photos.** JPG or PNG, ≤ 10 MB each, ≤ 20 per DPR (FR-M06-006). Only `file_object` rows with `purpose = 'dpr_photo'`, `variant = 'original'`, `status = 'available'`. Extract EXIF `taken_at` / GPS when present. Photos cannot be added or removed after submit except via the same-day window or an amendment. | API | Client-side resize before upload (§20). |
| AC-DPR-10 | Weather: `temp_min_c ≤ temp_max_c`, humidity 0–100 (DB). Optional pre-fill from the weather API using `site_lat` / `site_lng` (FR-M06-009). | API | |
| AC-DPR-11 | **Contractor inline add.** Find-or-create `contractor` by normalised name (lowercase, trimmed, internal spaces collapsed); never offer merged contractors; then find-or-create the `project_contractor` link (default `party_type` chosen by the engineer). One transaction. | API | |
| AC-DPR-12 | **New DPR pre-fill.** Copy the previous submitted DPR's personnel groups (contractors only, not counts) and site location / contract no. | API, UI | |
| AC-DPR-13 | **Amendment request** (after the edit window). Requester: the Site Engineer (or the PM). Reason required. `proposed_document` = full DPR JSON (header fields + all sections). Only one `pending` amendment per DPR (DB). `amendment_no` = max + 1. | API | |
| AC-DPR-14 | **Amendment decision.** By the project's PM or Admin. **[P]** (OQ-RP-03): a PM may approve their own request. Reject requires `decision_note`. Approve, in one transaction: store `before_snapshot`; replace the DPR's sections from `proposed_document`; activity rows that already have write-back revisions are **soft-removed** (`removed_at`) rather than deleted; apply write-backs under the stale rule and set `writeback_outcome` (`applied`, `skipped_stale_schedule` or `no_change`); set `applied_at`; keep `dpr_ref`, `submitted_at`, `is_late`; audit. The requester may withdraw while pending. | API | |
| AC-DPR-15 | DPR PDF export (FR-M06-011) for any user with read access; `visitors_text` is personal data and never appears in dashboards or aggregates (NFR-PRIV-02). | API | |

---

## 7. Weekly submission, escalation and client reports

### 7.1 Weekly submission

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-WKS-01 | Create/edit/approve requires `PM@project:X` (approval is PM only — §16). `week_start` must be a Monday (DB) and not later than the current week's Monday (project-local). | API | |
| AC-WKS-02 | Draft defaults: `active_stages` = the project's currently active stages; `scope_change_text` = "No scope change". | API | |
| AC-WKS-03 | **Addressed risks while drafting.** Adding a risk via Top Risk / Top Action / commentary link / dismiss inserts `submission_addressed_risk` with the matching `method`; dismissal requires `dismissal_reason` on that row. The risk must be the same project's and `status = 'open'`. Choosing a Top Risk sets `top_risk_id`, pre-fills `top_risk_text` and inserts a `top_risk` row automatically (FR-M08-002). Risk statuses do **not** change until approval. "Commentary" means an explicit link from the editor, not text scanning. | API | |
| AC-WKS-04 | **Approval validations.** `top_risk_text`, `top_action`, `pm_commentary` present; `escalation_reason` present if `escalate`; every value in `active_stages` is an in-scope stage of the project; **BR-18**: no `risk_issue` of the project with `source = 'auto_overdue_task' AND status = 'open' AND addressed_at IS NULL` lacks a `submission_addressed_risk` row in this submission — if any do, reject and list them by title (US-04). | API | |
| AC-WKS-05 | **Approval transaction.** (1) Copy schedule values: `schedule_version_id` = latest applied version, `planned_pct` / `actual_pct` / `spi` / `rag` from today's metrics snapshot (recompute first); all null if no schedule — allowed, flagged "no schedule" (§20). (2) Set `status = 'approved'`, `approved_by`, `approved_at`, `is_late = approved_at > (week_start + 7 days) 09:00 project-local` (BR-07). (3) **Apply active stages**: chips not currently active → `active` (`activated` event); currently active stages not in the chips → `inactive` (`deactivated` event); each event carries `submission_id`. (4) For each `submission_addressed_risk`: `method = 'dismissed'` → risk `status = 'dismissed'`, copy `dismissal_reason`, `closed_at = now()`; otherwise → `addressed_at = now()`, `addressed_submission_id`. (5) If `escalate`, insert `escalation` (`status = 'open'`). (6) If this row supersedes another, set the old one to `superseded`. (7) Audit all with one correlation ID. (8) After commit, notify (approved → ExCo digest; late → ExCo digest + Admin; escalation raised → all `ExCo@global`). | API | |
| AC-WKS-06 | **Immutability.** Approved submissions and their `submission_addressed_risk` rows cannot change (DB trigger); the API returns "Approved submissions are read-only — ask an Admin to supersede". | API | |
| AC-WKS-07 | **Supersede (FR-M07-011).** Admin authorises with reason: create a new draft copying the approved content, `revision_no` = old + 1, `supersedes_submission_id`, `supersede_reason`, `supersede_authorised_by/at`. The PM edits and approves it through AC-WKS-04/05; only then does the old row become `superseded`. DB allows at most one approved and one draft per project-week. | API | |
| AC-WKS-08 | **Outstanding detection.** A project with `status = 'active'` (not on hold or cancelled) and no approved submission for last week after Monday 09:00 project-local is outstanding (FR-M07-008). Reminder `weekly.due_soon` at Sunday 09:00 project-local **[P]**. | JOB | |

### 7.2 Escalation

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-ESC-01 | Escalations are created **only** by weekly approval (AC-WKS-05). Reason, raiser and raised time are read from the submission, not copied. | API | |
| AC-ESC-02 | **Acknowledge** (ExCo only): `UPDATE escalation SET status='acknowledged', acknowledged_by=$u, acknowledged_at=now() WHERE escalation_id=$id AND status='open'`. If 0 rows were updated, someone else got there first: return "Already acknowledged by X" and offer to add a response. Optional note → `escalation_response` with `kind = 'acknowledgement'`. Notify the PM. | API | First acknowledgement wins (FR-M07-010). |
| AC-ESC-03 | **Resolve** (ExCo only, **[P]** — PM cannot): allowed only from `acknowledged` (the UI may offer acknowledge + resolve in one action, done as two steps in one transaction). Optional note → response `kind = 'resolution'`. Notify the PM. | API | GCA tracks both steps. |
| AC-ESC-04 | **Responses**: ExCo users and the project's PM may post `kind = 'comment'`. Responses are never edited or deleted. Posting does not change status. | API | |
| AC-ESC-05 | **No automatic status changes** (BR-13) except voiding on project cancellation (AC-PRJ-05, **[P]**). | API, JOB | |
| AC-ESC-06 | **Aged reminder.** Open escalations older than 48 h trigger `escalation.aged` to all `ExCo@global` users (in-app + email), once per escalation per day (dedupe key `escalation_aged:<id>:<date>`), and show as "aged" in the ExCo queue (§20). | JOB | |

### 7.3 Client reports

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-CRP-01 | Client report generation and send only from an `approved` submission (FR-M15-001), by the project's PM. | API | |
| AC-CRP-02 | **Content filter (BR-14).** The PDF must never include: escalation flag/reason, ExCo decision text, risk scores, auto-generated risk details, engineer photo captions where a `client_caption` exists, or visitor names. It includes: project header, week narrative (PM commentary), % complete, milestones (schedule + custom), forecast end, selected photos. | API | Test this explicitly. |
| AC-CRP-03 | **Photo selection.** Photos must come from the project's **submitted** DPRs with `report_date` inside the submission week; default selection = none, UI suggests the week's photos. Selection stays editable after approval. | API | |
| AC-CRP-04 | **Send.** Generate the PDF, store it as `file_object` (`purpose = 'client_report_pdf'`), insert `client_report_send` (`queued`) and `client_report_recipient` rows copying the email and name at that moment (contacts with `receives_reports = true` plus any extra addresses entered). The mail job sets `sent` (with `sent_at`, `provider_message_id`) or `failed` (with `failure_reason`). Resends are new rows. Notify the PM on completion. | API, JOB | |

---

## 8. Risks, issues and change requests

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-RSK-01 | Manual risks/issues: created and edited by the project's PM (or Admin); Site Engineers view only (§16). Defaults: `status = 'open'`, `addressed_at = NULL`, `opened_at = now()`, owner = creator. Category from active `risk_category` rows. Stage tag must be an in-scope stage. | API | |
| AC-RSK-02 | **Status transitions:** open → mitigated / closed / dismissed (reason required); mitigated → closed or open; closed / dismissed → open (reopen clears `closed_at`, reason audited). `auto_resolved` is set only by the system (AC-SCH-23). `closed_at` is set whenever the status leaves `open` (the DB checks consistency). | API | |
| AC-RSK-03 | **Risk → issue conversion** (PM): sets `kind = 'issue'`, `realised_at`, `realised_by`, clears `likelihood`. One-way; not allowed for `source = 'auto_overdue_task'`. | API | The DB trigger also blocks issue → risk and changes to auto risks. |
| AC-RSK-04 | **High-score notification:** when a risk/issue becomes open with `score ≥ 15` (on create or on a score change), notify PM and ExCo digest (`risk.high_score`), deduped per risk. | API | §17.1. |
| AC-CHG-01 | Raise: the project's PM, or the Site Engineer on their own project (§16). `change_no` = max for project + 1 (lock). `cost_currency` required if `cost_impact` given. Notify `ExCo@global` (`change.raised`). | API | |
| AC-CHG-02 | **Decide** (ExCo only): insert `change_approval` (`approver_role = 'exco'`); reject requires `comment`. A unique violation on `(change_id, approver_role)` means another ExCo member already decided: return "Already decided by X". In the same transaction set `change_request.status` (approved / rejected) and `decided_at`. Notify the raiser. | API | One ExCo decision is enough. |
| AC-CHG-03 | **Required roles** come from configuration: `['exco']` in R1, `['exco', 'finance']` from R2. Status becomes `approved` only when every required role has approved, `rejected` as soon as any rejects. | API | Future-proofing. |
| AC-CHG-04 | **Withdraw:** only the raiser, only while `pending`; sets `withdrawn_at`. | API | |
| AC-CHG-05 | Approved change requests unlock rebaseline uploads (AC-SCH-02). "Implemented" is derived (a rebaseline version references it), never stored. | API | |

---

## 9. Notifications and files

| ID | Rule | Where | Notes |
|---|---|---|---|
| AC-NTF-01 | **Creation.** One `notification` per recipient per event, created after the triggering transaction commits (outbox or post-commit hook). `title` and `body` are rendered at creation. Committee events fan out to all current `ExCo@global` users. | API, SCH, JOB | |
| AC-NTF-02 | **Channel resolution** per recipient and type: if `notification_type.can_opt_out = false`, always use the type defaults; otherwise use the user's `notification_preference` row for that channel if one exists, else the type default. `in_app` = resolved in-app setting. For email: insert `notification_delivery` with `pending` if enabled, `suppressed` if disabled. | API, JOB | |
| AC-NTF-03 | **Dedupe** with `dedupe_key` for every job-generated alert (`dpr_missing:<project>:<date>`, `overdue_risks:<project>:<date>`, `escalation_aged:<id>:<date>`, `weekly_due:<project>:<week>`); treat the unique violation as "already sent". | JOB | |
| AC-NTF-04 | Preferences cannot be set to disabled for locked types (`can_opt_out = false`): `escalation.raised`, `dpr.missing`, `schedule.overdue_risks_created`. | API | |
| AC-NTF-05 | **Email sender job:** picks `pending` deliveries, retries up to 5 attempts with backoff, records `last_error`, then `failed`. | JOB | |
| AC-FIL-01 | **Upload flow.** Insert `file_object` (`pending_upload`, purpose, project, uploader) → return a signed upload URL → on completion verify size, mime type (by content, not extension) and SHA-256 → set `scanning` → malware scan (NFR-SEC-05) → `available` or `rejected` with `rejection_reason`. | API, JOB | |
| AC-FIL-02 | **Limits by purpose:** `dpr_photo` JPG/PNG ≤ 10 MB; `activity_attachment` **[P]** ≤ 25 MB (images ≤ 10 MB); `schedule_mpp` `.mpp` ≤ 50 MB **[P]**; `client_report_pdf` system-generated only. | API | |
| AC-FIL-03 | **Variants.** For images, a job creates `thumbnail` and `display` (1600 px long edge) rows with `parent_file_id` = the original (FR-M06-006). Owner tables always link the `original`. | JOB | |
| AC-FIL-04 | **Downloads** are authorised through the owning entity (user must be able to read the activity, DPR, schedule version or submission). Serve via short-lived signed URLs. `project_id` allows an early reject before resolving the owner. | API | |
| AC-FIL-05 | **Orphans:** `available` files of a purpose not referenced by their owner table after 24 h, and `pending_upload` rows older than 24 h, are deleted (row and object). | JOB | |

---

## 10. Scheduled jobs

| Job | When | Does | Rules |
|---|---|---|---|
| Overdue sweep | Nightly per project, shortly after local midnight | Create and auto-resolve overdue risks against the stored schedule; notify PM of new ones | AC-SCH-20 to 23, AC-NTF-03 |
| Metrics snapshot | Nightly per project (after the sweep) | Upsert today's `project_metrics_snapshot` | AC-SCH-30 to 34 |
| DPR missing check | 23:00 project-local daily | For each expected DPR day (§15.4) with no submitted DPR, notify Site Engineer and PM | BR-06, BR-16, AC-NTF-03 |
| Weekly due reminder | Sunday 09:00 project-local **[P]** | Notify PMs with no approved submission for the current week | AC-WKS-08 |
| Outstanding / late weekly | Monday 09:00 project-local | Mark outstanding; dashboards read it | AC-WKS-08 |
| Escalation aged | Hourly | Remind ExCo about open escalations older than 48 h | AC-ESC-06 |
| Draft DPR purge | Nightly | Delete drafts with `updated_at` older than 30 days (children cascade) | §15.5 |
| Soft-delete purge | Nightly | Hard-delete rows and files soft-deleted more than 90 days ago | AC-GEN-08 |
| File orphan sweep | Nightly | AC-FIL-05 | |
| Image variants / malware scan | On upload (queue) | AC-FIL-01, AC-FIL-03 | |
| Email sender | Continuous (queue) | AC-NTF-05 | |
| Notification purge | Weekly | Delete read notifications older than 12 months **[P]** | §15.5 |
| Audit partitions | Monthly | Create next month's partition ahead of time; drop partitions older than retention | `db-sanity-checklist.md` |

**Expected DPR day (used by the DPR-missing job and coverage chip FR-M07-002):** day D is expected when Stage 7 was active on D according to `stage_state_history`, `extract(isodow from D)` is in `project.dpr_expected_weekdays`, D is not in `holiday` for `project.holiday_calendar_id` unless `project_calendar_exception` marks it `is_working_day = true`, and no exception marks it `is_working_day = false`.
