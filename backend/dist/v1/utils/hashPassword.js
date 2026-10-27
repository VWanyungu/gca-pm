import bcrypt from 'bcrypt';
export default async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}
