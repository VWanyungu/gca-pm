# javamppms

Parses an MS Project `.mpp` into the rows the backend stores in `schedule_task` /
`schedule_task_revision`. That is all it does: no database, no queue, no state.
The backend owns the `schedule_version` lifecycle and every write (AC-SCH-04 onwards).

## API

```
GET  /health  -> 200 {"status":"ok"}

POST /parse   body = raw .mpp bytes (not multipart), max 50 MB
      200 -> {"status_date","project_name","task_count","tasks":[...]}
      422 -> {"diagnostics":[{"mpp_unique_id","field","message"}]}   store in parse_diagnostics
      400 -> empty body
      413 -> over 50 MB
```

Parsing is all-or-nothing (AC-SCH-04): any diagnostic means no `tasks` at all.

Task fields are named exactly as their target columns, so the backend inserts them
without renaming. Dates are ISO-8601 **local** date-times as MS Project stored them —
the file carries no timezone, so the backend resolves them against `project.timezone`
(AC-GEN-06). The project-summary row (UniqueID 0) and blank spacer rows are skipped
(AC-SCH-05).

## Local setup

The JDK and Maven live under `~/.local/share` (installed without root):

```bash
export JAVA_HOME=~/.local/share/jdk-21.0.12.1+1
export PATH=$JAVA_HOME/bin:~/.local/share/apache-maven-3.9.16/bin:$PATH
```

## Build, test, run

```bash
mvn test                       # parses src/test/resources/sample.mpp
mvn package                    # -> target/javamppms.jar (fat jar)
java -Xmx512m -jar target/javamppms.jar
```

`MPP_HOST` (default `127.0.0.1`) and `MPP_PORT` (default `8081`) configure the listener.

```bash
curl -X POST --data-binary @schedule.mpp http://127.0.0.1:8081/parse
```

## Deployment

Runs as its own process next to the backend, e.g. under PM2:

```bash
pm2 start --name javamppms --interpreter none java -- -Xmx512m -jar /path/to/javamppms.jar
```

It binds to localhost and has **no authentication of its own**. If it ever moves to a
separate host, put a shared secret in front of it and set `MPP_HOST`.

## Known limits

- `FIXED_DURATION_AND_UNITS` is mapped to `fixed_duration`; the `schedule_task_type`
  enum has no fourth value.
- Predecessors are returned as bare Unique IDs. Relation type (FS/SS/FF/SF) and lag are
  dropped — the frontend's `ScheduleTask.predecessors` is `number[]`.
- `is_active` is returned but has no column yet. MS Project inactive tasks would
  otherwise be imported as live work; decide in the backend before inserting.

## What the sample file taught us

`src/test/resources/sample.mpp` is a real planner-produced schedule (Gitanga Mall,
83 tasks). Two things in it contradict assumptions elsewhere in the codebase:

- **Summary rows can carry the milestone flag.** Three do ("Ground Floor", "1st Floor",
  "2nd Floor"), each spanning weeks. So `is_milestone` never implies zero duration, and
  anything listing milestones must also filter on `is_summary = false`.
- **The real phases sit at outline level 2, not 1.** The file has a single level-1 row
  wrapping everything ("GITANGA MALL RETICULATION PROJECT"). Code that treats level 1 as
  the phase list, or walks `parent_task_id` to the root to find a task's phase, gets one
  bucket for the whole project.
