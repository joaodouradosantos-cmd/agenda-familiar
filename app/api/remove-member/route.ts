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
  const userId = String(body.user_id || '').trim();
  if (!userId) return NextResponse.json({ error: 'missing_user_id' }, { status: 400 });

  const anon = getAnonSupabase();
  const { data: userData, error: userErr } = await anon.auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });

  const requesterEmail = (userData.user.email || '').toLowerCase();
  const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase();
  if (!ownerEmail || requesterEmail !== ownerEmail) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const familyId = process.env.FAMILY_ID!;
  const service = getServiceSupabase();

  // não permitir remover o próprio admin por engano
  if (userData.user.id === userId) {
    return NextResponse.json({ error: 'cannot_remove_self' }, { status: 400 });
  }

  const { error } = await service
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
