import jwt from 'jsonwebtoken';
import 'dotenv/config';
function requireSecret(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Missing env var: ${name}`);
    return v;
}
export default function generateJwtToken(user, type) {
    const payload = { userId: user.userId, email: user.email, role: user.role };
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
