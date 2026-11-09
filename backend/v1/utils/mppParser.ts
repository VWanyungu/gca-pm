/**
 * Client for javamppms, the MS Project parser (see /javamppms). It turns file bytes into
 * the columns schedule_task_revision stores; everything else about an upload is decided here
 * in the backend.
 */

const PARSER_URL = process.env.MPP_PARSER_URL ?? 'http://127.0.0.1:8081';

/** A 50 MB file parses in well under a second; anything near this is a hung service. */
const PARSE_TIMEOUT_MS = Number(process.env.MPP_PARSER_TIMEOUT_MS ?? 60_000);

/** Mirrors Diagnostic in the Java service. Stored as schedule_version.parse_diagnostics. */
export interface ParseDiagnostic {
  mpp_unique_id?: number;
  field?: string;
  message: string;
}

/** Mirrors TaskDto. Dates are ISO-8601 local date-times with no zone, exactly as MS Project
 *  stored them — the caller resolves them against the project's timezone (AC-GEN-06). */
export interface ParsedTask {
  mpp_unique_id: number;
  parent_mpp_unique_id: number | null;
  outline_level: number;
  wbs: string | null;
  task_name: string;
  duration_minutes: number;
  baseline_start: string | null;
  baseline_finish: string | null;
  start: string;
  expected_finish: string;
  actual_start: string | null;
  actual_finish: string | null;
  pct_work_complete: number;
  planned_pct_complete: number;
  is_milestone: boolean;
  is_summary: boolean;
  is_critical: boolean;
  is_active: boolean;
  task_type: 'fixed_units' | 'fixed_duration' | 'fixed_work';
  predecessors: number[];
  resource_names: string[];
}

export interface ParsedSchedule {
  /** Local date-time; the date part is the project-local status date (AC-SCH-09). */
  status_date: string | null;
  project_name: string | null;
  task_count: number;
  tasks: ParsedTask[];
}

/** The parser rejected the file. Carries the diagnostics the Planner needs to see. */
export class MppParseError extends Error {
  constructor(readonly diagnostics: ParseDiagnostic[]) {
    super(diagnostics[0]?.message ?? 'The file could not be parsed');
    this.name = 'MppParseError';
  }
}

/** The parser could not be reached or misbehaved. Distinct from a bad file: the upload can
 *  be retried unchanged once the service is back. */
export class MppParserUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MppParserUnavailableError';
  }
}

export async function parseMpp(bytes: Buffer): Promise<ParsedSchedule> {
  let response: Response;
  try {
    response = await fetch(`${PARSER_URL}/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(PARSE_TIMEOUT_MS),
    });
  } catch (err) {
    throw new MppParserUnavailableError(
      `Could not reach the schedule parser at ${PARSER_URL}: ${
        err instanceof Error ? err.message : 'unknown error'
      }`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new MppParserUnavailableError(
      `The schedule parser returned ${response.status} with a body that is not JSON`,
    );
  }

  if (response.status === 200) {
    return payload as ParsedSchedule;
  }

  // 400/413/422 all describe the file itself, and all carry diagnostics.
  const diagnostics = (payload as { diagnostics?: ParseDiagnostic[] }).diagnostics;
  if (diagnostics?.length) {
    throw new MppParseError(diagnostics);
  }

  throw new MppParserUnavailableError(
    `The schedule parser returned ${response.status} without diagnostics`,
  );
}

export interface ScheduleExportInput {
  project_name: string | null;
  status_date: string | null;
  tasks: ParsedTask[];
}

/** The inverse of parseMpp: current task data in, an MS Project file out (ScheduleBuilder on
 *  the Java side). There is no binary .mpp writer available, so this is MSPDI XML — the format
 *  MS Project opens natively — not a .mpp file. */
export async function buildScheduleExport(input: ScheduleExportInput): Promise<Buffer> {
  let response: Response;
  try {
    response = await fetch(`${PARSER_URL}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(PARSE_TIMEOUT_MS),
    });
  } catch (err) {
    throw new MppParserUnavailableError(
      `Could not reach the schedule parser at ${PARSER_URL}: ${
        err instanceof Error ? err.message : 'unknown error'
      }`,
    );
  }

  if (response.status !== 200) {
    let message = `The schedule parser returned ${response.status} while building the export`;
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      // Body wasn't JSON; keep the generic message.
    }
    throw new MppParserUnavailableError(message);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function parserIsReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${PARSER_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}
