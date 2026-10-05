import db from '../dbSetup.js';
import type { UserRole } from '../../../types.js';

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
  role: UserRole;
  is_verified: string;
  created_at: Date;
}

export interface UserAuthView {
  userId: string | null;
  email: string | null;
  passwordHash: string | null;
  role: UserRole | null;
}

export interface CreateUserInput {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  username: string;
  isVerified?: string;
  role?: UserRole;
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
      .select('id', 'first_name', 'last_name', 'email', 'username', 'role', 'is_verified', 'created_at')
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
      .select<{ id: string; email: string; password_hash: string; role: UserRole }[]>(
        'id',
        'email',
        'password_hash',
        'role',
      )
      .where('email', email);

    if (!user) return { userId: null, email: null, passwordHash: null, role: null };

    return {
      userId: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      role: user.role,
    };
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
        is_verified: input.isVerified || 'false',
        role: input.role || 'user',
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
    const [row] = await db('refreshTokens')
      .select<{ refresh_token: string }[]>('refresh_token')
      .where('refresh_token', token);
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

  static async blacklistToken(token: string): Promise<{ token: string; blacklisted: boolean }> {
    const [row] = await db('tokens')
      .insert({ token })
      .returning<{ token: string; blacklisted: boolean }[]>(['token', 'blacklisted']);
    if (!row) throw new Error('Failed to blacklist token');
    return { token: row.token, blacklisted: row.blacklisted };
  }

  static async checkBlacklistToken(token: string): Promise<boolean> {
    const [row] = await db('tokens')
      .select<{ blacklisted: boolean }[]>('blacklisted')
      .where('token', token);
    return row ? row.blacklisted : false;
  }
}
