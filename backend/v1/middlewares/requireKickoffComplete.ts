import type { RequestHandler } from 'express';
import db from '../database/dbSetup.js';

/**
 * AC-STG-11: DPR, weekly, risk, change-request, milestone and schedule-upload writes are
 * locked until the project's Kickoff gate stage (stage_no 0) is complete. A project with no
 * stage_no 0 row at all (created before this gate existed) is treated as unlocked.
 */
export default function requireKickoffComplete(): RequestHandler {
  return async (req, res, next) => {
    const { projectId } = req.params;
    const stage0 = await db('project_stage').where({ project_id: projectId, stage_no: 0 }).first();
    if (stage0 && stage0.state !== 'complete') {
      res.status(403).json({ status: 'error', data: null, message: 'Project kickoff is not complete yet' });
      return;
    }
    next();
  };
}
