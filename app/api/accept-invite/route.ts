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

  const anon = getAnonSupabase();
  const { data: userData, error: userErr } = await anon.auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });

  const user = userData.user;
  const email = (user.email || '').toLowerCase();
  const familyId = process.env.FAMILY_ID!;
  const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase();
  if (!familyId) return NextResponse.json({ error: 'missing_family_id' }, { status: 500 });

  const service = getServiceSupabase();

  // já é membro?
  const { data: existing } = await service
    .from('family_members')
    .select('role')
    .eq('family_id', familyId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ ok: true, status: 'already_member' });

  // o dono entra automaticamente
  if (email && ownerEmail && email === ownerEmail) {
    const { error } = await service.from('family_members').insert({
      family_id: familyId,
      user_id: user.id,
      role: 'admin',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, status: 'owner_added' });
  }

  // ver convite por email
  const { data: invite } = await service
    .from('invites')
    .select('id, role, accepted_at')
    .eq('family_id', familyId)
    .ilike('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invite) return NextResponse.json({ ok: true, status: 'no_invite' });

  // adiciona membro (idempotente via try/ignore)
  const role = (invite as any).role || 'member';
  const { error: insErr } = await service.from('family_members').insert({
    family_id: familyId,
    user_id: user.id,
    role,
  });

  // se já existia por corrida, ignora
  if (insErr && !String(insErr.message || '').toLowerCase().includes('duplicate')) {
    return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  // marca convite como aceite
  if (!(invite as any).accepted_at) {
    await service.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', (invite as any).id);
  }

  return NextResponse.json({ ok: true, status: 'accepted', role });
}
