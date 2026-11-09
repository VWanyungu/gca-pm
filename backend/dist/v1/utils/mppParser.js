/**
 * Client for javamppms, the MS Project parser (see /javamppms). It turns file bytes into
 * the columns schedule_task_revision stores; everything else about an upload is decided here
 * in the backend.
 */
const PARSER_URL = process.env.MPP_PARSER_URL ?? 'http://127.0.0.1:8081';
/** A 50 MB file parses in well under a second; anything near this is a hung service. */
const PARSE_TIMEOUT_MS = Number(process.env.MPP_PARSER_TIMEOUT_MS ?? 60_000);
/** The parser rejected the file. Carries the diagnostics the Planner needs to see. */
export class MppParseError extends Error {
    diagnostics;
    constructor(diagnostics) {
        super(diagnostics[0]?.message ?? 'The file could not be parsed');
        this.diagnostics = diagnostics;
        this.name = 'MppParseError';
    }
}
/** The parser could not be reached or misbehaved. Distinct from a bad file: the upload can
 *  be retried unchanged once the service is back. */
export class MppParserUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MppParserUnavailableError';
    }
}
export async function parseMpp(bytes) {
    let response;
    try {
        response = await fetch(`${PARSER_URL}/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: new Uint8Array(bytes),
            signal: AbortSignal.timeout(PARSE_TIMEOUT_MS),
        });
    }
    catch (err) {
        throw new MppParserUnavailableError(`Could not reach the schedule parser at ${PARSER_URL}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
    let payload;
    try {
        payload = await response.json();
    }
    catch {
        throw new MppParserUnavailableError(`The schedule parser returned ${response.status} with a body that is not JSON`);
    }
    if (response.status === 200) {
        return payload;
    }
    // 400/413/422 all describe the file itself, and all carry diagnostics.
    const diagnostics = payload.diagnostics;
    if (diagnostics?.length) {
        throw new MppParseError(diagnostics);
    }
    throw new MppParserUnavailableError(`The schedule parser returned ${response.status} without diagnostics`);
}
/** The inverse of parseMpp: current task data in, an MS Project file out (ScheduleBuilder on
 *  the Java side). There is no binary .mpp writer available, so this is MSPDI XML — the format
 *  MS Project opens natively — not a .mpp file. */
export async function buildScheduleExport(input) {
    let response;
    try {
        response = await fetch(`${PARSER_URL}/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
            signal: AbortSignal.timeout(PARSE_TIMEOUT_MS),
        });
    }
    catch (err) {
        throw new MppParserUnavailableError(`Could not reach the schedule parser at ${PARSER_URL}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
    if (response.status !== 200) {
        let message = `The schedule parser returned ${response.status} while building the export`;
        try {
            const payload = (await response.json());
            if (payload.message) {
                message = payload.message;
            }
        }
        catch {
            // Body wasn't JSON; keep the generic message.
        }
        throw new MppParserUnavailableError(message);
    }
    return Buffer.from(await response.arrayBuffer());
}
export async function parserIsReachable() {
    try {
        const response = await fetch(`${PARSER_URL}/health`, { signal: AbortSignal.timeout(2000) });
        return response.ok;
    }
    catch {
        return false;
    }
}
