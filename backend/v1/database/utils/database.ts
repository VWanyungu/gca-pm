import db from '../dbSetup.js';

export interface Paginated<T> {
  users: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface UserListItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string | null;
  is_verified: boolean;
  created_at: Date;
}

export interface UserAuthView {
  userId: string | null;
  email: string | null;
  passwordHash: string | null;
}

export interface CreateUserInput {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  username: string;
  isVerified?: boolean;
}

export interface UpdatePasswordInput {
  userId: string;
  passwordHash: string;
}

export class Users {
  static async getAllUsers({
    page = 1,
    limit = 10,
  }: { page?: number; limit?: number }): Promise<Paginated<UserListItem>> {
    const offset = (page - 1) * limit;
    const users = await db<UserListItem>('users')
      .select('id', 'first_name', 'last_name', 'email', 'username', 'is_verified', 'created_at')
      .limit(limit)
      .offset(offset)
      .orderBy('id');

    const [row] = await db('users').count<{ total: string }[]>('* as total');
    const total = Number(row?.total ?? 0);

    return {
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  static async getSingleUserByEmail(email: string): Promise<UserAuthView> {
    const [user] = await db('users')
      .select<{ id: string; email: string; password_hash: string }[]>(
        'id',
        'email',
        'password_hash',
      )
      .where('email', email);

    if (!user) return { userId: null, email: null, passwordHash: null };

    return { userId: user.id, email: user.email, passwordHash: user.password_hash };
  }

  static async createUser(input: CreateUserInput): Promise<{ userId: string; email: string }> {
    const [user] = await db('users')
      .insert({
        id: input.id,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        password_hash: input.passwordHash,
        username: input.username,
        is_verified: input.isVerified ?? false,
      })
      .returning<{ id: string; email: string }[]>(['id', 'email']);

    if (!user) throw new Error('Failed to create user');
    return { userId: user.id, email: user.email };
  }

  static async updateUserPassword(
    input: UpdatePasswordInput,
  ): Promise<{ status: 'success' | 'fail'; error: string | null }> {
    try {
      const affected = await db('users')
        .where('id', input.userId)
        .update({ password_hash: input.passwordHash });

      if (affected === 0) return { status: 'fail', error: 'User not found' };
      return { status: 'success', error: null };
    } catch (err) {
      return { status: 'fail', error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}

export class Tokens {
  static async getRefreshToken(token: string): Promise<{ refreshToken: string | null }> {
    const [row] = await db('refreshTokens').select('refresh_token').where('refresh_token', token);
    return { refreshToken: row ? row.refresh_token : null };
  }

  static async storeRefreshToken(userId: string, token: string): Promise<void> {
    await db('refreshTokens').insert({ user_id: userId, refresh_token: token });
  }

  static async deleteRefreshToken(token: string): Promise<{ deletedToken: string | null }> {
    const [deleted] = await db('refreshTokens')
      .where('refresh_token', token)
      .del()
      .returning<{ refresh_token: string }[]>('refresh_token');
    return { deletedToken: deleted ? deleted.refresh_token : null };
  }

  static async blacklistToken(token: string): Promise<void> {
    await db('tokens').insert({ token }).onConflict('token').ignore();
  }

  static async checkBlacklistToken(token: string): Promise<boolean> {
    const row = await db('tokens').select('id').where('token', token).first();
    return !!row;
  }
}

export type RoleName = 'PM' | 'Planner' | 'SiteEngineer' | 'ExCo' | 'Admin' | 'ProjectCreator';
export type ScopeType = 'global' | 'program' | 'project';
export interface RoleGrant {
  role: RoleName;
  scope_type: ScopeType;
  program_id: string | null;
  project_id: string | null;
}

export interface RoleGrantRow extends RoleGrant {
  attribute_id: string;
  user_id: string;
  granted_by: string;
  granted_at: Date;
}

export interface GrantInput {
  attribute_id: string;
  user_id: string;
  role: RoleName;
  scope_type: ScopeType;
  program_id: number | null;
  project_id: string | null;
  granted_by: string;
}

export class Roles {
  static async getRoles(userId: string): Promise<RoleGrant[]> {
    const rows = await db('roles')
      .select('role', 'scope_type', 'program_id', 'project_id')
      .where({ user_id: userId })
      .whereNull('revoked_at');
    return rows;
  }

  static async grant(input: GrantInput): Promise<string> {
    const [row] = await db('roles').insert(input).returning('attribute_id');
    return row.attribute_id;
  }

  static async revoke(attributeId: string, revokedBy: string, reason: string | null): Promise<RoleGrantRow | null> {
    const [row] = await db('roles')
      .where({ attribute_id: attributeId })
      .whereNull('revoked_at')
      .update({ revoked_by: revokedBy, revoked_at: db.fn.now(), revoke_reason: reason })
      .returning(['attribute_id', 'user_id', 'role', 'scope_type', 'program_id', 'project_id', 'granted_by', 'granted_at']);
    return row ?? null;
  }

  static async list({
    userId,
    page = 1,
    limit = 10,
  }: { userId?: string; page?: number; limit?: number }): Promise<{
    roles: RoleGrantRow[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const base = db('roles').whereNull('revoked_at');
    if (userId) base.where({ user_id: userId });

    const countRows = await base.clone().count<{ count: string }[]>('attribute_id as count');
    const total = Number(countRows[0]?.count ?? 0);

    const roles = await base
      .clone()
      .select('attribute_id', 'user_id', 'role', 'scope_type', 'program_id', 'project_id', 'granted_by', 'granted_at')
      .orderBy('granted_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { roles, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getById(attributeId: string): Promise<RoleGrantRow | null> {
    const row = await db('roles')
      .select('attribute_id', 'user_id', 'role', 'scope_type', 'program_id', 'project_id', 'granted_by', 'granted_at')
      .where({ attribute_id: attributeId })
      .whereNull('revoked_at')
      .first();
    return row ?? null;
  }
}
