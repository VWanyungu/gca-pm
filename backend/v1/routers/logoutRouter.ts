import express from 'express';
import { Tokens } from '../database/utils/database.js';
import { Cache } from '../database/utils/cache.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { token, refreshToken } = req.body as { token?: string; refreshToken?: string };

  if (!token || !refreshToken) {
    res.status(400).json({ status: 'error', data: null, message: 'token and refreshToken required' });
    return;
  }

  try {
    await Tokens.deleteRefreshToken(refreshToken);
    await Cache.set(`blacklist_${token}`, true, { ex: 900 });
    await Tokens.blacklistToken(token);

    res.status(200).json({ status: 'success', data: null, message: 'Logout successful' });
  } catch {
    res.status(500).json({ status: 'fail', data: null, message: 'Logout failed' });
  }
});

export default router;
