import express from 'express';
import { Users } from '../database/utils/database.js';
import generateJwtToken from '../utils/generateJwtToken.js';
import { sendPasswordResetMail } from '../utils/sendMail.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ status: 'error', data: null, message: 'Email not provided' });
    return;
  }

  const user = await Users.getSingleUserByEmail(email);
  if (!user.email || user.userId === null || !user.role) {
    res.status(404).json({ status: 'error', data: null, message: 'Email not found' });
    return;
  }

  const { forgotPasswordToken } = generateJwtToken(
    { userId: user.userId, email: user.email, role: user.role },
    'forgotPassword',
  );
  if (!forgotPasswordToken) throw new Error('Token generation failed');

  const sendRes = await sendPasswordResetMail({
    to: user.email,
    subject: 'Gas Connect Africa - Password Reset',
    html: `<p><a href="${process.env.FRONTEND_URL}/reset-password/${forgotPasswordToken}">Click to reset your password. This link is valid for 15 minutes.</a></p>`,
  });

  if (sendRes.status === 'error') {
    res.status(500).json({ status: 'error', data: null, message: sendRes.message });
    return;
  }

  res.status(200).json({
    status: 'success',
    data: { resetLink: `${process.env.FRONTEND_URL}/reset-password/${forgotPasswordToken}` },
    message: 'Email sent',
  });
});

export default router;
