import express from 'express';
import { randomUUID } from 'node:crypto';
import { Users } from '../database/utils/database.js';
import hashPassword from '../utils/hashPassword.js';
import { createUserSchema } from '../utils/validation.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const passwordHash = await hashPassword(req.body.password);
    const userObj = {
      id: randomUUID(),
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      username: req.body.username,
      passwordHash,
    };

    const { error, value } = createUserSchema.validate(userObj, { abortEarly: false });
    if (error) {
      res.status(400).json({
        status: 'error',
        data: { errors: error.details.map((d) => d.message) },
        message: 'Invalid signup payload',
      });
      return;
    }

    const response = await Users.createUser(value);
    res.status(200).json({
      status: 'success',
      data: { response },
      message: 'User created successfully',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

export default router;
