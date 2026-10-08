import Joi from 'joi';
import type { CreateUserInput } from '../database/utils/database.js';
import type { RoleName, ScopeType } from '../database/utils/database.js';

export const createUserSchema = Joi.object<CreateUserInput>({
  id: Joi.string().uuid().required(),
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  email: Joi.string().email().lowercase().required(),
  passwordHash: Joi.string().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
});

export interface CreateRoleBody {
  userId: string;
  role: RoleName;
  scopeType: ScopeType;
  programId?: number | null;
  projectId?: string | null;
}

export interface RevokeRoleBody {
  reason?: string | null;
}

export interface ListRolesQuery {
  userId?: string;
  page?: number;
  limit?: number;
}

const ROLE_NAMES: RoleName[] = ['PM', 'Planner', 'SiteEngineer', 'ExCo', 'Admin', 'ProjectCreator'];
const SCOPE_TYPES: ScopeType[] = ['global', 'program', 'project'];

export const createRoleSchema = Joi.object<CreateRoleBody>({
  userId: Joi.string().uuid().required(),
  role: Joi.string().valid(...ROLE_NAMES).required(),
  scopeType: Joi.string().valid(...SCOPE_TYPES).required(),
  programId: Joi.when('scopeType', {
    is: 'program',
    then: Joi.number().integer().positive().required(),
    otherwise: Joi.any().strip(),
  }),
  projectId: Joi.when('scopeType', {
    is: 'project',
    then: Joi.string().uuid().required(),
    otherwise: Joi.any().strip(),
  }),
});

export const revokeRoleParamsSchema = Joi.object({
  attributeId: Joi.string().uuid().required(),
});

export const revokeRoleBodySchema = Joi.object<RevokeRoleBody>({
  reason: Joi.string().trim().max(10000).allow(null, '').optional(),
});

export const listRolesQuerySchema = Joi.object<ListRolesQuery>({
  userId: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});
