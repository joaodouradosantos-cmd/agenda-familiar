import { NextResponse } from 'next/server';
import { getAnonSupabase, getServiceSupabase } from '@/lib/supabaseServer';

function getBearerToken(req: Request) {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const emailRaw = String(body.email || '').trim();
  const role = String(body.role || 'member').trim();

  if (!emailRaw) return NextResponse.json({ error: 'missing_email' }, { status: 400 });

  const anon = getAnonSupabase();
  const { data: userData, error: userErr } = await anon.auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });

  const requesterEmail = (userData.user.email || '').toLowerCase();
  const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase();
  if (!ownerEmail || requesterEmail !== ownerEmail) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const familyId = process.env.FAMILY_ID || process.env.NEXT_PUBLIC_FAMILY_ID;
  if (!familyId) return NextResponse.json({ error: 'missing_family_id' }, { status: 500 });

  const service = getServiceSupabase();

  // envia email de convite (magic link)
  const redirectTo = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || undefined;
  const { data: inviteAuth, error: inviteErr } = await service.auth.admin.inviteUserByEmail(emailRaw, {
    redirectTo,
  });

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 400 });

  // guarda convite (para auto-aceitar no primeiro login)
  const { error: dbErr } = await service.from('invites').insert({
    family_id: familyId,
    email: emailRaw.toLowerCase(),
    role: role || 'member',
  });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, invited: inviteAuth?.user?.id || null });
}
