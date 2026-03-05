
"use client";

// Página de calendário com melhorias visuais e correcção de gravação
// Esta versão chama automaticamente o endpoint de aceitação de convites para garantir
// que o utilizador está associado à família antes de carregar os eventos. Também
// aplica um estilo mais moderno usando chips coloridos para cada categoria e
// organiza o layout com caixas com sombras suaves.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Tipo de categorias de eventos suportados
export type CategoriaEvento =
  | "Aniversário"
  | "Consulta"
  | "Reunião"
  | "Feriado"
  | "Férias"
  | "Jantar"
  | "Outros"
  | "Festa"
  | "Fim de semana"
  | "Teste";

// Tipo de evento recebido da base de dados
export interface DbEvent {
  id: string;
  title: string;
  category: CategoriaEvento;
  start_at: string; // ISO string
  end_at?: string | null; // ISO string (opcional)
  created_at: string;
}

export default function CalendarioPageAtualizado() {
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [eventos, setEventos] = useState<DbEvent[]>([]);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaCategoria, setNovaCategoria] = useState<CategoriaEvento>("Aniversário");
  const [novaDataHora, setNovaDataHora] = useState("");
  // Data/hora de fim do evento
  const [novaDataHoraFim, setNovaDataHoraFim] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaEvento | "Todas">("Todas");
  const [msg, setMsg] = useState<string | null>(null);

  // Calcula se o botão de adicionar deve estar desativado
  const disableAdicionar = useMemo(() => {
    if (!novoTitulo.trim() || !familyId || !novaDataHora) return true;
    if (novaDataHoraFim) {
      // Se a data de fim existir e for anterior ao início, desactiva
      try {
        return new Date(novaDataHoraFim) < new Date(novaDataHora);
      } catch {
        return true;
      }
    }
    return false;
  }, [novoTitulo, familyId, novaDataHora, novaDataHoraFim]);

  // Lista de categorias disponíveis
  const categorias: CategoriaEvento[] = [
    "Aniversário",
    "Consulta",
    "Reunião",
    "Feriado",
    "Férias",
    "Jantar",
    "Outros",
    "Festa",
    "Fim de semana",
    "Teste",
  ];

  // Definição de cores para cada categoria (chips)
  const categoryColors: Record<CategoriaEvento, string> = {
    "Aniversário": "bg-red-100 text-red-800",
    Consulta: "bg-green-100 text-green-800",
    "Reunião": "bg-blue-100 text-blue-800",
    Feriado: "bg-yellow-100 text-yellow-800",
    Férias: "bg-indigo-100 text-indigo-800",
    Jantar: "bg-pink-100 text-pink-800",
    Outros: "bg-gray-100 text-gray-800",
    Festa: "bg-purple-100 text-purple-800",
    "Fim de semana": "bg-orange-100 text-orange-800",
    Teste: "bg-teal-100 text-teal-800",
  };

  // Carrega eventos para a família do utilizador
  async function loadEventos() {
    setLoading(true);
    setMsg(null);
    // Obtém sessão atual
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      setLoading(false);
      setMsg("Sessão não encontrada. Faz login.");
      setEventos([]);
      return;
    }
    // Garante que o utilizador está associado à família (auto-aceitação de convite)
    try {
      await fetch("/api/accept-invite", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      // Ignora erros de aceitação de convite
    }
    // Obtém dados do utilizador incluindo a familyId
    const meRes = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
    const me = await meRes.json();
    // Se o /api/me não regressar familyId, usa localStorage ou variável de ambiente como fallback
    const storedFamilyId = typeof window !== "undefined" ? window.localStorage.getItem("familyId") : null;
    const envFamilyId = process.env.NEXT_PUBLIC_FAMILY_ID || null;
    const effectiveFamilyId = me.familyId || storedFamilyId || envFamilyId;
    if (!effectiveFamilyId) {
      setFamilyId(null);
      setEventos([]);
      setLoading(false);
      setMsg("Família não configurada (NEXT_PUBLIC_FAMILY_ID / FAMILY_ID).");
      return;
    }
    setFamilyId(effectiveFamilyId);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem("familyId", effectiveFamilyId);
    } catch {}
    // Consulta eventos ordenados pela data de início
    const { data, error } = await supabase
      .from("events")
      .select("id, title, category, start_at, end_at, created_at")
      .eq("family_id", effectiveFamilyId)
      .order("start_at", { ascending: true });
    if (error) {
      setMsg(error.message);
      setEventos([]);
    } else {
      setEventos((data || []) as DbEvent[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadEventos();
  }, []);

  // Filtra e ordena eventos por data de início
  const eventosVisiveis = useMemo(() => {
    const base =
      filtroCategoria === "Todas"
        ? eventos
        : eventos.filter((e) => e.category === filtroCategoria);
    return [...base].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [eventos, filtroCategoria]);

  // Adiciona um novo evento
  async function adicionarEvento() {
    const titulo = novoTitulo.trim();
    if (!titulo || !familyId || !novaDataHora) return;
    setMsg(null);
    // Converte as datas de início e fim para ISO. Se não houver fim definido, mantém nulo
    const startIso = new Date(novaDataHora).toISOString();
    const endIso = novaDataHoraFim ? new Date(novaDataHoraFim).toISOString() : null;
    const { error } = await supabase.from("events").insert({
      family_id: familyId,
      title: titulo,
      category: novaCategoria,
      start_at: startIso,
      end_at: endIso,
    });
    if (error) {
      setMsg(error.message);
      return;
    }
    setNovoTitulo("");
    setNovaDataHora("");
    setNovaDataHoraFim("");
    setNovaCategoria("Aniversário");
    await loadEventos();
  }

  // Remove evento por id
  async function removerEvento(id: string) {
    setMsg(null);
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      setMsg(error.message);
    } else {
      await loadEventos();
    }
  }

  // Calcula estatísticas simples
  const total = eventos.length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
          <p className="text-sm text-gray-600">
            {total === 0 ? "Sem eventos." : `${total} evento(s) no total.`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadEventos}
            className="rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
          >
            Atualizar
          </button>
        </div>
      </div>
      {/* Mensagem de erro ou informação */}
      {msg && <div className="rounded-xl border bg-white p-3 text-sm shadow-sm">{msg}</div>}
      {/* Formulário de novo evento */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-700">Título</label>
            <input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Ex.: Aniversário do João"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Categoria</label>
            <select
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value as CategoriaEvento)}
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
            <label className="text-xs font-medium text-gray-700">Início</label>
            <input
              type="datetime-local"
              value={novaDataHora}
              onChange={(e) => setNovaDataHora(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
            <label className="mt-2 block text-xs font-medium text-gray-700">Fim (opcional)</label>
            <input
              type="datetime-local"
              value={novaDataHoraFim}
              onChange={(e) => setNovaDataHoraFim(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-600">
            <span className="font-medium">Filtro:</span>{" "}
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
            onClick={adicionarEvento}
            className="rounded-xl bg-black px-4 py-2 text-sm text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            disabled={disableAdicionar}
          >
            Adicionar
          </button>
        </div>
      </div>
      {/* Lista de eventos */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-gray-600">A carregar…</p>
        ) : eventosVisiveis.length === 0 ? (
          <p className="text-sm text-gray-600">Sem eventos para mostrar.</p>
        ) : (
          <ul className="space-y-2">
            {eventosVisiveis.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{e.title}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-medium ${categoryColors[e.category]}`}
                    >
                      {e.category}
                    </span>
                    <span>
                      {new Date(e.start_at).toLocaleString()}
                      {e.end_at ? ` – ${new Date(e.end_at).toLocaleString()}` : ""}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removerEvento(e.id)}
                  className="rounded-xl border bg-white px-3 py-2 text-xs shadow-sm hover:bg-gray-50"
                >
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
