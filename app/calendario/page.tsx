"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type CategoriaEvento = "Aniversário" | "Consulta" | "Reunião" | "Feriado" | "Férias" | "Jantar" | "Outros";

type DbEvent = {
  id: string;
  title: string;
  category: CategoriaEvento;
  start_at: string; // ISO (timestamptz)
  created_at: string;
};

function toIsoFromLocal(value: string) {
  // value vem de input datetime-local (sem timezone)
  const d = new Date(value);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return null;
  return d.toISOString();
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function CalendarioPage() {
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [eventos, setEventos] = useState<DbEvent[]>([]);

  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<CategoriaEvento>("Aniversário");
  const [data, setData] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const [msg, setMsg] = useState<string | null>(null);

  const categorias: CategoriaEvento[] = [
    "Aniversário",
    "Consulta",
    "Reunião",
    "Feriado",
    "Férias",
    "Jantar",
    "Outros",
  ];

  async function loadEvents() {
    setLoading(true);
    setMsg(null);

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;

    if (!token) {
      setLoading(false);
      setFamilyId(null);
      setEventos([]);
      setMsg("Sessão não encontrada. Faz login.");
      return;
    }

    // garante auto-aceitação de convite (idempotente)
    await fetch("/api/accept-invite", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const meRes = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
    const me = await meRes.json();

    if (!me.familyId) {
      setFamilyId(null);
      setEventos([]);
      setLoading(false);
      setMsg('Família não configurada (NEXT_PUBLIC_FAMILY_ID / FAMILY_ID).');
      return;
    }

    setFamilyId(me.familyId);

    const { data, error } = await supabase
      .from("events")
      .select("id, title, category, start_at, created_at")
      .eq("family_id", me.familyId)
      .order("start_at", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setMsg(error.message);
      setEventos([]);
    } else {
      setEventos((data || []) as DbEvent[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const eventosOrdenados = useMemo(() => {
    return [...eventos].sort((a, b) => a.start_at.localeCompare(b.start_at));
  }, [eventos]);

  const agora = Date.now();
  const futuros = eventosOrdenados.filter((e) => {
    const ts = new Date(e.start_at).getTime();
    return Number.isFinite(ts) ? ts >= agora - 24 * 60 * 60 * 1000 : true; // tolerância 24h
  });

  async function guardarEvento() {
    const t = titulo.trim();
    const iso = data ? toIsoFromLocal(data) : null;

    if (!t || !iso || !familyId) return;

    setMsg(null);

    if (editId) {
      const { error } = await supabase
        .from("events")
        .update({ title: t, category: categoria, start_at: iso })
        .eq("id", editId);

      if (error) {
        setMsg(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("events").insert({
        family_id: familyId,
        title: t,
        category: categoria,
        start_at: iso,
      });

      if (error) {
        setMsg(error.message);
        return;
      }
    }

    setTitulo("");
    setData("");
    setCategoria("Aniversário");
    setEditId(null);

    await loadEvents();
  }

  async function removerEvento(id: string) {
    setMsg(null);
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) setMsg(error.message);
    else await loadEvents();
  }

  function iniciarEdicao(e: DbEvent) {
    setEditId(e.id);
    setTitulo(e.title);
    setCategoria(e.category);
    setData(toLocalInputValue(e.start_at));
  }

  function cancelarEdicao() {
    setEditId(null);
    setTitulo("");
    setCategoria("Aniversário");
    setData("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
          <p className="text-sm text-gray-600">Eventos partilhados online (família).</p>
        </div>

        <div className="flex gap-2">
          <button onClick={loadEvents} className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50">
            Atualizar
          </button>
        </div>
      </div>

      {msg && <div className="rounded-xl border bg-white p-3 text-sm">{msg}</div>}

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">{editId ? "Editar evento" : "Adicionar evento"}</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_220px_180px_120px]">
          <input
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
            placeholder="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") guardarEvento();
            }}
          />

          <input
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
            type="datetime-local"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />

          <select
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaEvento)}
          >
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={guardarEvento}
            className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            disabled={!titulo.trim() || !data || !familyId || loading}
          >
            {editId ? "Guardar" : "Adicionar"}
          </button>
        </div>

        {editId && (
          <div className="mt-2">
            <button onClick={cancelarEdicao} className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50">
              Cancelar edição
            </button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Próximos eventos</h2>

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600 shadow-sm">A carregar…</div>
        ) : futuros.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600 shadow-sm">Nenhum evento agendado.</div>
        ) : (
          <ul className="space-y-2">
            {futuros.map((e) => (
              <li key={e.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {e.category} · {new Date(e.start_at).toLocaleString("pt-PT")}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => iniciarEdicao(e)}
                      className="w-fit rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => removerEvento(e.id)}
                      className="w-fit rounded-xl border border-red-600 bg-red-600 px-3 py-2 text-sm text-white hover:opacity-90"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
