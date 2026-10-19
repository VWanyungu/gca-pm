import express from 'express';
import jwt from 'jsonwebtoken';
import { Tokens, Roles } from '../database/utils/database.js';
import generateJwtToken from '../utils/generateJwtToken.js';
import type { JwtUserPayload } from '../../types.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const inputRefreshToken = (req.body as { refreshToken?: string }).refreshToken;
  if (!inputRefreshToken) {
    res.status(401).json({ status: 'error', data: null, message: 'Refresh token not provided' });
    return;
  }

  const { refreshToken } = await Tokens.getRefreshToken(inputRefreshToken);
  if (!refreshToken) {
    res.status(401).json({ status: 'error', data: null, message: 'Revoked refresh token' });
    return;
  }

  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    res.status(500).json({ status: 'error', data: null, message: 'Server auth not configured' });
    return;
  }

  jwt.verify(refreshToken, secret, async (err, decoded) => {
    if (err || !decoded || typeof decoded === 'string') {
      res.status(401).json({ status: 'error', data: null, message: 'Invalid refresh token' });
      return;
    }

    const user = decoded as JwtUserPayload;

    // Read the grants back from the database rather than copying them out of the old token.
    // Roles change while a session is open — creating a project makes you its PM and Planner,
    // an Admin can revoke access — and a token minted from a token would carry the stale set
    // until the user signed out and in again. A revoked role must stop working, too.
    const roles = await Roles.getRoles(user.userId);

    const { token } = generateJwtToken({ ...user, role: roles }, 'token');
    res.status(200).json({ status: 'success', data: { token, role: roles }, message: 'Token refreshed' });
  });
});

export default router;
