import crypto from 'crypto';

// Server-only. Never import this from a 'use client' file.
// Uses Node's built-in scrypt rather than pulling in bcrypt as a dependency —
// plenty for a low-stakes, no-account password like this one.

const KEYLEN = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!password || !stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, KEYLEN).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(candidate, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
