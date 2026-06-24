import { customAlphabet } from 'nanoid';

// Avoids visually ambiguous characters (0/o, 1/l, etc).
const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
const randomPart = customAlphabet(alphabet, 5);

export function slugifyName(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 40);
}

// e.g. "Maya" -> "maya-j4k2x". The random suffix is what actually keeps the
// link unguessable — there's no login, so the slug itself is the access key.
export function makeCakeSlug(name) {
  const base = slugifyName(name) || 'cake';
  return `${base}-${randomPart()}`;
}
