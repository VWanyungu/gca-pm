import express from 'express';
import { PdmStages } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';

const router = express.Router();

const canView = authorize([
  { role: 'Admin', scopeType: 'global' },
  { role: 'ExCo', scopeType: 'global' },
  { role: 'ProjectCreator', scopeType: 'global' },
  { role: 'PM', scopeType: 'global' },
  { role: 'Planner', scopeType: 'global' },
  { role: 'SiteEngineer', scopeType: 'global' },
]);

// GET /pdm-stages — the 10 fixed PDM lifecycle stages, grouped by phase (develop/deliver/sustain)
router.get('/', canView, async (_req, res) => {
  try {
    const stages = await PdmStages.list();
    res.status(200).json({ status: 'success', data: { stages }, message: 'PDM stages retrieved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

export default router;
