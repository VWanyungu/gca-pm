import type { UserRolesItem } from "./v1/database/utils/database.js";

export type TokenRoleItem = Omit<UserRolesItem, 'attribute_id'>;

export interface JwtUserPayload {
  userId: string;
  email: string;
  role: TokenRoleItem[];
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
