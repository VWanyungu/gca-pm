import express from 'express';
import { Users } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';

const router = express.Router();

const canRead = authorize([
  { role: 'Admin', scopeType: 'global' },
  { role: 'ExCo', scopeType: 'global' },
  { role: 'ProjectCreator', scopeType: 'global' },
  { role: 'PM', scopeType: 'global' },
]);

const canWrite = authorize([{ role: 'Admin', scopeType: 'global' }]);

router.get('/', canRead, async (req, res) => {
  const type = (req.query.type as string | undefined) ?? (req.body as { type?: string })?.type;
  const inputEmail =
    (req.query.inputEmail as string | undefined) ?? (req.body as { inputEmail?: string })?.inputEmail;

  switch (type) {
    case 'multiple': {
      const page = parseInt(String(req.query.page ?? '1'), 10);
      const limit = parseInt(String(req.query.limit ?? '10'), 10);
      try {
        const response = await Users.getAllUsers({ page, limit });
        res.status(200).json({
          status: 'success',
          data: { response },
          message: 'Users retrieved successfully',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
      }
      return;
    }

    case 'single': {
      try {
        if (!inputEmail) {
          res.status(400).json({ status: 'error', data: null, message: 'inputEmail required' });
          return;
        }
        const user = await Users.getSingleUserByEmail(inputEmail);
        if (!user.email) {
          res.status(404).json({ status: 'error', data: null, message: 'User not found' });
          return;
        }
        res.status(200).json({
          status: 'success',
          data: { email: user.email },
          message: 'User retrieved successfully',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
      }
      return;
    }

    default:
      res.status(400).json({
        status: 'error',
        data: null,
        message: 'Specify type of fetch in request body',
      });
  }
});

router.put('/', canWrite, (_req, res) => {
  res.status(501).json({ status: 'error', data: null, message: 'Not implemented' });
});

router.delete('/', canWrite, (_req, res) => {
  res.status(501).json({ status: 'error', data: null, message: 'Not implemented' });
});

export default router;
