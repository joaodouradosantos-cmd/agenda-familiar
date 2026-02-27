'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Categoria = 'Casa' | 'Compras' | 'Trabalho' | 'Saúde' | 'Lazer' | 'Outros';

type DbTask = {
  id: string;
  description: string;
  category: Categoria;
  is_done: boolean;
  due_date: string | null; // YYYY-MM-DD
  created_at: string;
};

export default function TarefasPage() {
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [tarefas, setTarefas] = useState<DbTask[]>([]);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaCategoria, setNovaCategoria] = useState<Categoria>('Casa');
  const [novaData, setNovaData] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<Categoria | 'Todas'>('Todas');
  const [msg, setMsg] = useState<string | null>(null);

  const categorias: Categoria[] = ['Casa', 'Compras', 'Trabalho', 'Saúde', 'Lazer', 'Outros'];

  async function loadTasks() {
    setLoading(true);
    setMsg(null);

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;

    if (!token) {
      setLoading(false);
      setMsg('Sessão não encontrada. Faz login.');
      setTarefas([]);
      return;
    }

    const meRes = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
    const me = await meRes.json();
    if (!me.familyId) {
      setFamilyId(null);
      setTarefas([]);
      setLoading(false);
      setMsg('Família não configurada (NEXT_PUBLIC_FAMILY_ID / FAMILY_ID).');
      return;
    }
    setFamilyId(me.familyId);

    const { data, error } = await supabase
      .from('tasks')
      .select('id, description, category, is_done, due_date, created_at')
      .eq('family_id', me.familyId)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      setMsg(error.message);
      setTarefas([]);
    } else {
      setTarefas((data || []) as DbTask[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
  }, []);

  const tarefasVisiveis = useMemo(() => {
    const base = filtroCategoria === 'Todas' ? tarefas : tarefas.filter((t) => t.category === filtroCategoria);
    return [...base].sort((a, b) => {
      const ad = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      if (ad !== bd) return ad - bd;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [tarefas, filtroCategoria]);

  async function adicionarTarefa() {
    const desc = novaDescricao.trim();
    if (!desc || !familyId) return;

    setMsg(null);

    const { error } = await supabase.from('tasks').insert({
      family_id: familyId,
      description: desc,
      category: novaCategoria,
      is_done: false,
      due_date: novaData || null,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setNovaDescricao('');
    setNovaData('');
    setNovaCategoria('Casa');
    await loadTasks();
  }

  async function toggleConcluida(id: string, isDone: boolean) {
    setMsg(null);
    const { error } = await supabase.from('tasks').update({ is_done: !isDone }).eq('id', id);
    if (error) setMsg(error.message);
    else await loadTasks();
  }

  async function removerTarefa(id: string) {
    setMsg(null);
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) setMsg(error.message);
    else await loadTasks();
  }

  async function limparConcluidas() {
    if (!familyId) return;
    setMsg(null);
    const { error } = await supabase.from('tasks').delete().eq('family_id', familyId).eq('is_done', true);
    if (error) setMsg(error.message);
    else await loadTasks();
  }

  const total = tarefas.length;
  const feitas = tarefas.filter((t) => t.is_done).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-sm text-gray-600">{total === 0 ? 'Sem tarefas.' : `${feitas} concluída(s) em ${total}.`}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={limparConcluidas}
            className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={tarefas.every((t) => !t.is_done)}
          >
            Limpar concluídas
          </button>
          <button onClick={loadTasks} className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50">
            Atualizar
          </button>
        </div>
      </div>

      {msg && <div className="rounded-xl border bg-white p-3 text-sm">{msg}</div>}

      <div className="rounded-2xl border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-700">Descrição</label>
            <input
              value={novaDescricao}
              onChange={(e) => setNovaDescricao(e.target.value)}
              placeholder="Ex.: Comprar leite"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Categoria</label>
            <select
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value as Categoria)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            >
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Data</label>
            <input
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-600">
            <span className="font-medium">Filtro:</span>{' '}
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value as any)}
              className="rounded-lg border px-2 py-1 text-xs"
            >
              <option value="Todas">Todas</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={adicionarTarefa}
            className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={!novaDescricao.trim() || !familyId}
          >
            Adicionar
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        {loading ? (
          <p className="text-sm text-gray-600">A carregar…</p>
        ) : tarefasVisiveis.length === 0 ? (
          <p className="text-sm text-gray-600">Sem tarefas para mostrar.</p>
        ) : (
          <ul className="space-y-2">
            {tarefasVisiveis.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={t.is_done} onChange={() => toggleConcluida(t.id, t.is_done)} />
                    <span className={t.is_done ? 'line-through text-gray-500' : ''}>{t.description}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {t.category}
                    {t.due_date ? ` • ${t.due_date}` : ''}
                  </div>
                </div>

                <button onClick={() => removerTarefa(t.id)} className="rounded-xl border bg-white px-3 py-2 text-xs hover:bg-gray-50">
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
