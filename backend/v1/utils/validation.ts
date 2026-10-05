import Joi from 'joi';
import type { CreateUserInput } from '../database/utils/database.js';

export const createUserSchema = Joi.object<CreateUserInput>({
  id: Joi.string().uuid().required(),
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  email: Joi.string().email().lowercase().required(),
  passwordHash: Joi.string().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  role: Joi.string().valid('user', 'admin').default('user'),
});
