import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import 'dotenv/config';
import './types.js';
import checkVersion from './middlewares/version.js';
import { recoverScheduleVersions } from './v1/utils/scheduleProcessor.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Schedule files arrive as base64 in the JSON body, and AC-FIL-02 allows 50 MB of .mpp,
// which is ~68 MB encoded. Only this route gets the larger ceiling; everything else keeps
// the 100 kb default.
app.use('/projects/:projectId/schedule/upload', express.json({ limit: '70mb' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'success', data: null, message: 'ok' });
});

app.use(checkVersion());

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  const status = typeof err?.status === 'number' ? err.status : 500;
  const message = err?.expose ? err.message : 'Internal server error';
  res.status(status).json({ status: 'error', data: null, message });
};
app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`App live on port ${port}`);
  // Uploads that were mid-flight when this process last stopped would otherwise sit in
  // queued/parsing forever, blocking their project's next upload (ux_sv_one_inflight).
  void recoverScheduleVersions().catch((err) =>
    console.error('Schedule recovery failed', err),
  );
});
