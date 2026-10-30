import express from 'express';
import helmetImport from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import 'dotenv/config';
import './types.js';
import checkVersion from './middlewares/version.js';
import { recoverScheduleVersions, refreshAllProjectMetrics, nextThreeAm, } from './v1/utils/scheduleProcessor.js';
import { parserIsReachable } from './v1/utils/mppParser.js';
// shortcut: Vercel's Express framework preset type-checks this file with a resolver
// that infers helmet's default export as the whole module namespace instead of the
// callable default (passes under local tsc, fails there); cast past it.
const helmet = helmetImport;
const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
// Schedule files arrive as base64 in the JSON body, and AC-FIL-02 allows 50 MB of .mpp,
// which is ~68 MB encoded. Only this route gets the larger ceiling; everything else keeps
// the 100 kb default.
app.use('/projects/:projectId/schedule/upload', express.json({ limit: '70mb' }));
app.use(express.json());
app.get('/health', async (_req, res) => {
    const mppParserReachable = await parserIsReachable();
    res.status(200).json({ status: 'success', data: { mppParserReachable }, message: 'ok' });
});
app.use(checkVersion());
const errorHandler = (err, _req, res, _next) => {
    console.error(err);
    const status = typeof err?.status === 'number' ? err.status : 500;
    const message = err?.expose ? err.message : 'Internal server error';
    res.status(status).json({ status: 'error', data: null, message });
};
app.use(errorHandler);
// Push-style heartbeat (e.g. an Uptime Kuma push monitor): pinged after every nightly run so
// a missed or failed 3am refresh shows up as a gap/down alert instead of only a log line. A
// no-op until CRON_HEARTBEAT_URL is provisioned.
function pingHeartbeat(ok, msg) {
    const url = process.env.CRON_HEARTBEAT_URL;
    if (!url)
        return;
    const status = ok ? 'up' : 'down';
    fetch(`${url}?status=${status}&msg=${encodeURIComponent(msg)}`).catch((err) => console.error('Heartbeat ping failed', err));
}
// shortcut: a 24h setInterval drifts a few ms per tick and never catches up to a missed
// 3am if the process was down; re-arm from the real clock each time instead of trusting
// the interval to stay exact forever.
function scheduleNightlyMetricsRefresh() {
    const now = new Date();
    setTimeout(() => {
        void refreshAllProjectMetrics()
            .then(() => pingHeartbeat(true, 'Nightly metrics refresh completed'))
            .catch((err) => {
            console.error('Nightly metrics refresh failed', err);
            pingHeartbeat(false, String(err?.message ?? err));
        });
        scheduleNightlyMetricsRefresh();
    }, nextThreeAm(now).getTime() - now.getTime());
}
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log(`App live on port ${port}`);
    // Uploads that were mid-flight when this process last stopped would otherwise sit in
    // queued/parsing forever, blocking their project's next upload (ux_sv_one_inflight).
    void recoverScheduleVersions().catch((err) => console.error('Schedule recovery failed', err));
    scheduleNightlyMetricsRefresh();
});
