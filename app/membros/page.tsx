'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type MemberRow = {
  user_id: string;
  role: string;
  created_at: string;
};

export default function MembrosPage() {
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setMsg(null);

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      setLoading(false);
      setMsg('Sessão não encontrada. Faz login novamente.');
      return;
    }

    const meRes = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
    const me = await meRes.json();
    setFamilyId(me.familyId || null);
    setIsOwner(!!me.isOwner);

    if (!me.familyId) {
      setMembers([]);
      setLoading(false);
      setMsg('Família não configurada (NEXT_PUBLIC_FAMILY_ID / FAMILY_ID).');
      return;
    }

    const { data, error } = await supabase
      .from('family_members')
      .select('user_id, role, created_at')
      .eq('family_id', me.familyId)
      .order('created_at', { ascending: true });

    if (error) setMsg(error.message);
    setMembers((data || []) as MemberRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function invite() {
    setMsg(null);

    const email = inviteEmail.trim();
    if (!email) return;

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      setMsg('Sessão não encontrada.');
      return;
    }

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, role: 'member' }),
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(out?.error || 'Erro ao convidar.');
      return;
    }

    setInviteEmail('');
    setMsg('Convite enviado por email.');
  }

  async function removeMember(userId: string) {
    setMsg(null);

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      setMsg('Sessão não encontrada.');
      return;
    }

    const res = await fetch('/api/remove-member', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: userId }),
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(out?.error || 'Erro ao remover.');
      return;
    }

    setMsg('Membro removido.');
    await loadAll();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Membros</h1>
        <p className="text-sm text-gray-600">
          Só o administrador pode convidar e remover. Depois de entrar uma vez, fica registado no telemóvel.
        </p>
      </div>

      {msg && <div className="rounded-xl border bg-white p-3 text-sm">{msg}</div>}

      <div className="rounded-2xl border bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-sm text-gray-700">
            <div><span className="font-medium">Family ID:</span> {familyId || '—'}</div>
            <div><span className="font-medium">Permissão:</span> {isOwner ? 'Admin (dono)' : 'Membro'}</div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={async () => {
                const { error } = await supabase.auth.signOut();
                document.cookie = 'af_session=; Path=/; Max-Age=0';
                if (!error) window.location.href = '/login';
              }}
              className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              Terminar sessão
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <h2 className="font-medium">Convidar</h2>
        <p className="text-sm text-gray-600">
          O convite envia um link por email. Ao clicar, a pessoa entra e é adicionada automaticamente à tua família.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="w-full rounded-xl border px-3 py-2 text-sm"
            disabled={!isOwner}
          />
          <button
            onClick={invite}
            className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={!isOwner || !inviteEmail.trim()}
          >
            Enviar convite
          </button>
        </div>

        {!isOwner && (
          <div className="text-xs text-gray-500">
            Apenas o dono pode convidar/remover membros.
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <h2 className="font-medium">Lista de membros</h2>

        {loading ? (
          <p className="text-sm text-gray-600">A carregar…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-600">Sem membros.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">{m.user_id}</div>
                  <div className="text-xs text-gray-600">Role: {m.role}</div>
                </div>

                {isOwner && m.role !== 'admin' && (
                  <button
                    onClick={() => removeMember(m.user_id)}
                    className="rounded-xl border bg-white px-3 py-2 text-xs hover:bg-gray-50"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
