import express from 'express';
import { Users, Tokens, AccessRoles } from '../database/utils/database.js';
import type { AdminCreateUserInput, UpdateUserInput, RoleName } from '../database/utils/database.js';
import { Cache } from '../database/utils/cache.js';
import authorize from '../middlewares/authorize.js';
import { SEED_PASSWORD_HASH } from '../seeds/01_users.js';
import {
  userIdParamSchema,
  listUsersQuerySchema,
  adminCreateUserSchema,
  updateUserSchema,
  setUserStatusSchema,
} from '../utils/validation.js';

const router = express.Router();

const canRead = authorize([
  { role: 'Admin', scopeType: 'global' },
  { role: 'ExCo', scopeType: 'global' },
  { role: 'ProjectCreator', scopeType: 'global' },
  { role: 'PM', scopeType: 'global' },
]);

const canWrite = authorize([{ role: 'Admin', scopeType: 'global' }]);

/** Global role must be a currently-active entry in the access_role catalog. */
async function isGrantableRole(role: string | null | undefined): Promise<boolean> {
  if (!role) return true;
  const accessRole = await AccessRoles.getByName(role);
  return !!accessRole && accessRole.is_active;
}

router.get('/', canRead, async (req, res) => {
  const type = (req.query.type as string | undefined) ?? (req.body as { type?: string })?.type;
  const inputEmail =
    (req.query.inputEmail as string | undefined) ?? (req.body as { inputEmail?: string })?.inputEmail;

  switch (type) {
    case 'multiple': {
      const { error, value } = listUsersQuerySchema.validate(req.query, { abortEarly: false, stripUnknown: true });
      if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
      }
      const { page, limit, search, globalRole, status } = value;
      try {
        const response = await Users.getAllUsers({ page, limit, search, globalRole, status });
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

router.get('/:id', canRead, async (req, res) => {
  const { error, value } = userIdParamSchema.validate(req.params);
  if (error) {
    res.status(400).json({ status: 'error', data: null, message: error.message });
    return;
  }
  try {
    const user = await Users.getUserById((value as { id: string }).id);
    if (!user) {
      res.status(404).json({ status: 'error', data: null, message: 'User not found' });
      return;
    }
    res.status(200).json({ status: 'success', data: { user }, message: 'User retrieved successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// Admin-created user — no password field in the UI, so we set the seed default password.
// The user signs in with it and resets it via the existing forgot-password flow.
router.post('/', canWrite, async (req, res) => {
  const { error, value } = adminCreateUserSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    res.status(400).json({ status: 'error', data: null, message: error.message });
    return;
  }
  if (!(await isGrantableRole((value as AdminCreateUserInput).globalRole as RoleName | null))) {
    res.status(400).json({ status: 'error', data: null, message: 'Unknown or inactive role' });
    return;
  }
  try {
    const user = await Users.createUserAdmin(value as AdminCreateUserInput, SEED_PASSWORD_HASH, req.user!.userId);
    res.status(201).json({ status: 'success', data: { user }, message: 'User created' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

router.put('/:id', canWrite, async (req, res) => {
  const params = userIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = updateUserSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  if (!(await isGrantableRole((body.value as UpdateUserInput).globalRole as RoleName | null))) {
    res.status(400).json({ status: 'error', data: null, message: 'Unknown or inactive role' });
    return;
  }
  try {
    const user = await Users.updateUser(
      (params.value as { id: string }).id,
      body.value as UpdateUserInput,
      req.user!.userId,
    );
    if (!user) {
      res.status(404).json({ status: 'error', data: null, message: 'User not found' });
      return;
    }
    res.status(200).json({ status: 'success', data: { user }, message: 'User updated' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// Deactivation is a soft status flag, not a delete — records stay, access is revoked.
router.patch('/:id/status', canWrite, async (req, res) => {
  const params = userIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = setUserStatusSchema.validate(req.body ?? {});
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  try {
    const user = await Users.setStatus((params.value as { id: string }).id, body.value.status);
    if (!user) {
      res.status(404).json({ status: 'error', data: null, message: 'User not found' });
      return;
    }
    res.status(200).json({ status: 'success', data: { user }, message: 'User status updated' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// Forces the user to log in again everywhere: their refresh token is revoked outright,
// and their current access token (wherever it's held) stops being honoured as soon as
// it's next presented, via tokens_invalidated_at (see isSessionInvalidated).
router.post('/:id/invalidate-sessions', canWrite, async (req, res) => {
  const params = userIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { id } = params.value as { id: string };
  try {
    const invalidatedAt = await Users.invalidateSessions(id);
    if (!invalidatedAt) {
      res.status(404).json({ status: 'error', data: null, message: 'User not found' });
      return;
    }
    await Tokens.deleteAllRefreshTokensForUser(id);
    await Cache.set(`session_invalidated_${id}`, invalidatedAt.getTime(), { ex: 900 });
    res.status(200).json({ status: 'success', data: { invalidatedAt }, message: 'Sessions invalidated' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

export default router;
