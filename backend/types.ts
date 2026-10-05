export type UserRole = 'user' | 'admin';

export interface JwtUserPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  username: string | null;
  is_verified: string;
  role: UserRole;
  created_at: Date;
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'fail' | 'error';
  data: T | null;
  message: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}
