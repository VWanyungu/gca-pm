import express from 'express';
import bcrypt from 'bcrypt';
import { Users, Tokens } from '../database/utils/database.js';
import generateJwtToken from '../utils/generateJwtToken.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ status: 'error', data: null, message: 'Email and password required' });
    return;
  }

  try {
    const user = await Users.getSingleUserByEmail(email);

    if (!user.email || !user.passwordHash || user.userId === null) {
      res.status(404).json({ status: 'error', data: null, message: 'User not found' });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(400).json({ status: 'fail', data: null, message: 'Password does not match' });
      return;
    }

    const { token, refreshToken } = generateJwtToken(
      { userId: user.userId, email: user.email },
      'all',
    );
    if (!token || !refreshToken) throw new Error('Token generation failed');

    await Tokens.storeRefreshToken(user.userId, refreshToken);

    res.status(200).json({
      status: 'success',
      data: { token, refreshToken },
      message: 'Login successful',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

export default router;
