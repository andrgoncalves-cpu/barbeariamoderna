export const ADMIN_COOKIE_NAME = 'barbearia_admin_session';
const SESSION_DAYS = 7;

async function hmac(message: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET em falta no ambiente.');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createSessionToken(): Promise<string> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `admin:${expires}`;
  const signature = await hmac(payload);
  return `${payload}:${signature}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [role, expiresStr, signature] = parts;
  const payload = `${role}:${expiresStr}`;
  const expected = await hmac(payload);
  if (expected !== signature) return false;
  if (Date.now() > Number(expiresStr)) return false;
  return role === 'admin';
}

export function checkPassword(input: string): boolean {
  const correct = process.env.ADMIN_PASSWORD;
  if (!correct) return false;
  return input === correct;
}
