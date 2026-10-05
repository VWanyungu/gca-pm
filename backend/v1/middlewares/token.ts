import 'dotenv/config';
import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import type { JwtUserPayload } from '../../types.js';
import { isTokenBlacklisted } from '../utils/checkCache.js';

export default function authenticateToken(): RequestHandler {
  return (req, res, next) => {
    const permittedPaths = ['/login', '/signup', '/forgot-password'];
    const isPermitted =
      permittedPaths.includes(req.path) ||
      req.path.startsWith('/reset-password/') ||
      (req.path === '/users' && req.method === 'POST');

    if (isPermitted) return next();

    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
      res.status(401).json({ status: 'error', data: null, message: 'Token not provided' });
      return;
    }

    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      res.status(500).json({ status: 'error', data: null, message: 'Server auth not configured' });
      return;
    }

    jwt.verify(token, secret, async (err, decoded) => {
      if (err || !decoded || typeof decoded === 'string') {
        res.status(403).json({ status: 'error', data: null, message: 'Expired or invalid token' });
        return;
      }

      req.user = decoded as JwtUserPayload;

      const blacklisted = await isTokenBlacklisted(token);
      if (blacklisted) {
        res.status(403).json({ status: 'fail', data: null, message: 'Token is blacklisted' });
        return;
      }

      next();
    });
  };
}
