import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { isTokenBlacklisted, isSessionInvalidated } from '../utils/checkCache.js';
/**
 * `allowExpired` is for /token only: refreshing happens precisely because the access token
 * has expired, so rejecting it there makes the route unreachable. The signature and the
 * blacklist are still enforced, so the bearer must still hold a token this server minted
 * and did not log out — only the clock is forgiven.
 */
export default function authenticateToken({ allowExpired = false } = {}) {
    return (req, res, next) => {
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
        jwt.verify(token, secret, { ignoreExpiration: allowExpired }, async (err, decoded) => {
            if (err || !decoded || typeof decoded === 'string') {
                res.status(403).json({ status: 'error', data: null, message: 'Expired or invalid token' });
                return;
            }
            req.user = decoded;
            const blacklisted = await isTokenBlacklisted(token);
            if (blacklisted) {
                res.status(403).json({ status: 'fail', data: null, message: 'Token is blacklisted' });
                return;
            }
            const { iat } = decoded;
            if (iat !== undefined && (await isSessionInvalidated(req.user.userId, iat))) {
                res.status(403).json({ status: 'fail', data: null, message: 'Session invalidated, please log in again' });
                return;
            }
            next();
        });
    };
}
