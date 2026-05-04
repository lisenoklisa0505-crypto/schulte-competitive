import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

export function generateJWT(userId: number, username: string) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });
}

export async function verifyJWT(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
  } catch {
    return null;
  }
}