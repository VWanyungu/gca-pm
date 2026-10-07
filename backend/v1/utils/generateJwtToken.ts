import jwt from 'jsonwebtoken';
import 'dotenv/config';
import type { JwtUserPayload } from '../../types.js';

export type TokenType = 'all' | 'forgotPassword' | 'refreshToken' | 'token';

export interface TokenBundle {
  token?: string;
  refreshToken?: string;
  forgotPasswordToken?: string;
}

function requireSecret(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export default function generateJwtToken(user: JwtUserPayload, type: TokenType): TokenBundle {
  const payload: JwtUserPayload = { userId: user.userId, email: user.email };

  switch (type) {
    case 'all':
      return {
        token: jwt.sign(payload, requireSecret('ACCESS_TOKEN_SECRET'), { expiresIn: '15m' }),
        refreshToken: jwt.sign(payload, requireSecret('REFRESH_TOKEN_SECRET')),
        forgotPasswordToken: jwt.sign(payload, requireSecret('FORGOT_PASSWORD_TOKEN_SECRET'), {
          expiresIn: '15m',
        }),
      };

    case 'forgotPassword':
      return {
        forgotPasswordToken: jwt.sign(payload, requireSecret('FORGOT_PASSWORD_TOKEN_SECRET'), {
          expiresIn: '15m',
        }),
      };

    case 'refreshToken':
      return { refreshToken: jwt.sign(payload, requireSecret('REFRESH_TOKEN_SECRET')) };

    case 'token':
      return { token: jwt.sign(payload, requireSecret('ACCESS_TOKEN_SECRET'), { expiresIn: '15m' }) };

    default:
      return {
        token: jwt.sign(payload, requireSecret('ACCESS_TOKEN_SECRET'), { expiresIn: '15m' }),
      };
  }
}
