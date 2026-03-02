import { NextResponse } from 'next/server';
import { getAnonSupabase } from '@/lib/supabaseServer';

function getBearerToken(req: Request) {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 401 });

  const anon = getAnonSupabase();
  const { data: userData, error: userErr } = await anon.auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });

  const email = (userData.user.email || '').toLowerCase();
  const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase();
  // Allow either FAMILY_ID (server-only) or NEXT_PUBLIC_FAMILY_ID (client/server)
  // so the project works even if only one of them is configured in Vercel.
  const familyId = process.env.FAMILY_ID || process.env.NEXT_PUBLIC_FAMILY_ID || null;

  return NextResponse.json({
    userId: userData.user.id,
    email,
    isOwner: !!ownerEmail && email === ownerEmail,
    familyId,
  });
}
