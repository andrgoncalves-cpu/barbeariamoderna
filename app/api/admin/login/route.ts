import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, checkPassword, createSessionToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!checkPassword(password)) {
    return NextResponse.json({ error: 'Password incorreta.' }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
