# Syncing "Project Tracker GCL" updates into the app

Procedure for matching a new export of the Project Tracker spreadsheet (CSV)
against the `projects` already in the database and applying only the real
deltas. Repeat this each time a new tracker export needs to land.

## 1. Get the CSV rows

Read the CSV with a real CSV parser (not a plain text read) — several cells
contain embedded commas/newlines inside quotes (e.g. multi-line "TOP RISK" or
"BILLING MILESTONE" text). A quick way:

```bash
python3 -I - <<'EOF'
import csv
with open("<path to tracker csv>", newline='', encoding='utf-8-sig') as f:
    for row in csv.reader(f):
        print(row)
EOF
```

## 2. Match each row to an existing project

Match by `CODE` first (exact match against `projects.project_code`); several
rows have `-`/blank codes (placeholder codes, e.g. `900-00X.2026`) — match
those by project name instead (`REAL_PROJECT_IDS` in
`backend/v1/seeds/17_real_portfolio_data.ts` has the canonical id for every
known project). Flag any row that matches nothing as new/needs-manual-review —
don't guess.

## 3. Know which tracker columns actually have a column to land in

`projects` only has: `project_code`, `name`, `program_id`, `client_name`,
`country`, `site_location`, `is_civil`/`is_mechanical`/`is_electrical`,
`expected_start_date`, `expected_end_date`, `estimated_value`, `currency`,
`status`, `holiday_calendar_id`, `dpr_expected_weekdays`.

`FORECAST END`, `ACTUAL %`, `PLANNED %` and `SPI` map to
`project_metrics_snapshot` (`forecast_finish`, `actual_pct`, `planned_pct`,
`spi`/`rag`) — see step 3b, this is **not** a `projects` column and the table
has sharp edges.

`CPI`, `COST STATUS`, `ACTUAL PAID TO DATE`, `WORKING BUDGET`,
`ACTUAL SPENT TO DATE`, `TOP RISK`, `TOP ACTION`, `BILLING MILESTONE` still
have **no home anywhere in the schema** — don't invent one ad hoc (e.g. don't
force "TOP RISK" text into the `risk` table, which requires a real
`category_id` and `owner_id` the tracker doesn't give you). Report these as
not persisted rather than guessing a mapping. Also: the tracker's
`COST STATUS` column has been observed showing the exact same value
("Killed/ restoration required") on every single row — that's a stuck
spreadsheet default, not real data; don't trust a tracker column that's
identical across every row.

### 3b. `project_metrics_snapshot` is normally a computed table — treat writes to it as a last resort

This table is meant to be populated by the schedule microservice from a
parsed MS Project (`.mpp`) upload, keyed by `(project_id, as_of_date)` with a
**required, real** `schedule_version_id`. Before writing tracker numbers here:

- **Check for an existing snapshot on the same `as_of_date` first.** If the
  job already computed one for today, the tracker's manual % is a *different,
  less current measurement* (schedule-task progress vs. a PM's spreadsheet
  estimate) — writing over it destroys a more accurate number. Confirm with
  whoever asked before doing this.
- **A project with no `schedule_version` at all** (no schedule ever
  uploaded) has no legitimate row to write to — the FK chain is
  `project_metrics_snapshot.schedule_version_id` → `schedule_version` →
  (`source_file_id` → `file_object`, `uploaded_by` → `users`). Satisfying it
  means fabricating a fake "someone uploaded and we parsed a schedule" event
  (a real-shaped `file_object` + `schedule_version` row with a real-format
  sha256, an `applied` status, zero task counts) purely so the snapshot FK
  resolves. Only do this on an explicit, informed decision from whoever
  owns the data — show them exactly what tables/rows this fabricates before
  running it. Tag fabricated ids distinctly (e.g. a `99000000-...` prefix)
  and a `manual-backfill/...` `storage_key`, and attribute `uploaded_by` to
  the real account doing the backfill, so it's identifiable later.
- `spi`/`rag` are a pair — `(spi IS NULL) = (rag IS NULL)`. If the tracker's
  SPI cell is text like `"Not Updated"` rather than a number, leave both
  `NULL`, don't invent a number. Where the tracker gives a real SPI, derive
  `rag` from it directly (`>= 0.95` green-ish / `0.80–0.95` amber / `< 0.80`
  red) rather than trusting a tracker status-label column that may itself be
  corrupted (see the `COST STATUS` note above — it has leaked into other
  "status" columns in past exports).
- Verify the **actual production column names** before writing — they can
  drift from what's in the migration files you can read locally (e.g. a
  production `schedule_version` table was found with `overdue_task_count`
  where the migration in this checkout defines `overdue_risks_created`).
  Run `\d <table>` against the real target database first.

`STAGE` (e.g. "Stage 7: Construction") maps to `project_stage.state` /
`current_stage_no`, not a `projects` column — only touch it if the tracker's
stage number genuinely disagrees with what's already in `project_stage`.

## 4. Diff against the TARGET database's current state — not the fixture seed

**Always read the current values from the database you're about to write to
before computing the diff.** Production and the local `gca-present` fixture
drift from each other (PMs edit projects in the live app), so a value that's
null in the seed fixture may already be filled correctly in production, and a
value the tracker gives may already be stale next to a more recent in-app
edit. Read-only query first:

```bash
psql "sslmode=require host=$DB_HOST port=5432 user=$DB_USER dbname=$DB_NAME" \
  -c "SELECT project_id, project_code, name, status, expected_start_date, expected_end_date, estimated_value, currency FROM projects ORDER BY name;"
```

Bucket every matched field into:
- **Safe fill** — DB value is currently `NULL`, tracker gives a value → apply
  automatically, no confirmation needed.
- **Already in sync** — DB value already equals the tracker value → no-op.
- **Conflict** — DB has a non-null value that disagrees with the tracker →
  do **not** silently overwrite. Surface both values and ask which wins
  before writing anything (the in-app value is often the more recent one).

## 5. Get sign-off on conflicts, then write

Apply everything as a single transaction (`BEGIN; ... COMMIT;`) of targeted
`UPDATE ... WHERE project_id = '<uuid>'` statements — not a blanket re-seed —
so an unrelated field already set in the DB is never clobbered. Re-select
afterward to confirm the written values match what was intended.

## 6. Local vs. production

- Local dev DB name/credentials: `backend/.env` (`DB_*`, unprefixed).
- Production: `backend/.env` (`PROD_DB_*`). Never print `PROD_DB_PASSWORD`
  to the terminal — extract it into a shell variable from the file and pass
  it straight to `PGPASSWORD` in the same command.
- Default posture: seed/verify locally first, then repeat against
  production once confirmed. If the user explicitly says to go straight to
  production, still do step 4's read-only diff and step 5's conflict
  check before writing — those are what catch a stale tracker overwriting a
  newer in-app edit.

## Reference: 2026-11-02 run

Source: `Project Tracker GCL(Sheet2).csv` (10 project rows). Applied directly
to production after conflict sign-off:

- Gitanga Mall — tracker overwrote prod (`project_code`, `expected_end_date`,
  `estimated_value`) per explicit confirmation, since prod's values looked
  stale next to the tracker.
- Dominican Nuns, Peace Junior — tracker's dates overwrote prod's per
  explicit confirmation.
- Vulcan Strategic Hub, Utawala Autogas, Kerarapon Autogas, Mister Bakers —
  `estimated_value`/`currency` filled in (were `NULL`).
- Nakuru, Kericho — already in sync, no write.
- PEK — left `active`; tracker's own row was self-contradictory
  (`Stage 7: Construction` stage note vs. `STATUS = Not started`), kept the
  value consistent with the stage per user decision.
- `TOP RISK`/`TOP ACTION`/`BILLING MILESTONE`/`CPI`/cost figures were not
  persisted — no schema column exists for them.
- After a follow-up request, also wrote `ACTUAL %`/`PLANNED %`/`SPI`/
  `FORECAST END` into `project_metrics_snapshot` for all 10, on explicit
  instruction after flagging the risk: this **overwrote** Gitanga Mall's
  real job-computed 2026-11-02 snapshot with the tracker's manual figures,
  and **fabricated** a `file_object` + `schedule_version` row for Dominican
  Nuns, Peace Junior, PEK and Mister Bakers (none had ever had a schedule
  uploaded) so the snapshot FK could resolve. `rag` was derived from the
  tracker's own SPI number per the rule in 3b, not from its status-label
  column, which was corrupted for 3 of the 10 rows.
