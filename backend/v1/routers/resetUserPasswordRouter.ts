import express from 'express';
import jwt from 'jsonwebtoken';
import { Users } from '../database/utils/database.js';
import hashPassword from '../utils/hashPassword.js';
import type { JwtUserPayload } from '../../types.js';

const router = express.Router();

router.post('/:resetToken', async (req, res) => {
  const { resetToken } = req.params;
  const secret = process.env.FORGOT_PASSWORD_TOKEN_SECRET;
  if (!secret) {
    res.status(500).json({ status: 'error', data: null, message: 'Server auth not configured' });
    return;
  }

  jwt.verify(resetToken, secret, async (err, decoded) => {
    if (err || !decoded || typeof decoded === 'string') {
      res.status(401).json({ status: 'error', data: null, message: 'Invalid token provided' });
      return;
    }

    const user = decoded as JwtUserPayload;
    const { password } = req.body as { password?: string };
    if (!password) {
      res.status(400).json({ status: 'error', data: null, message: 'Password required' });
      return;
    }
    const hashedPassword = await hashPassword(password);
    const updateRes = await Users.updateUserPassword({
      userId: user.userId,
      passwordHash: hashedPassword,
    });

    if (updateRes.error) {
      res.status(500).json({ status: 'fail', data: null, message: updateRes.error });
      return;
    }

    res.status(200).json({ status: 'success', data: null, message: 'Password reset successful' });
  });
});

export default router;
