import type { RoleGrant } from "./v1/database/utils/database.js";

export type TokenGrant = RoleGrant;

export interface JwtUserPayload {
  userId: string;
  email: string;
  role: TokenGrant[];
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
