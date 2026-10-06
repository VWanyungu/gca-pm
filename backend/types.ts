export interface JwtUserPayload {
  userId: string;
  email: string;
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
