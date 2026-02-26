"use client";

import { useEffect, useMemo, useState } from "react";

type CategoriaEvento = "Aniversário" | "Consulta" | "Reunião" | "Feriado" | "Férias" | "Jantar" | "Outros";

interface Evento {
  id: string;
  titulo: string;
  categoria: CategoriaEvento;
  data: string; // datetime-local (YYYY-MM-DDTHH:mm)
  createdAt: number;
}

const STORAGE_KEY = "agenda_familiar_eventos_v1";

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function CalendarioPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<CategoriaEvento>("Aniversário");
  const [data, setData] = useState("");

  const categorias: CategoriaEvento[] = [
    "Aniversário",
    "Consulta",
    "Reunião",
    "Feriado",
    "Férias",
    "Jantar",
    "Outros",
  ];

  useEffect(() => {
    const stored = safeParse<Evento[]>(typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null);
    if (stored && Array.isArray(stored)) {
      setEventos(
        stored
          .filter((e) => e && typeof e === "object")
          .map((e) => ({
            id: String((e as any).id ?? uid()),
            titulo: String((e as any).titulo ?? ""),
            categoria: (e as any).categoria as CategoriaEvento,
            data: String((e as any).data ?? ""),
            createdAt: Number((e as any).createdAt ?? Date.now()),
          }))
          .filter((e) => e.titulo.trim().length > 0 && e.data),
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eventos));
  }, [eventos]);

  const eventosOrdenados = useMemo(() => {
    return [...eventos].sort((a, b) => a.data.localeCompare(b.data));
  }, [eventos]);

  const adicionarEvento = () => {
    const t = titulo.trim();
    if (!t || !data) return;

    const novo: Evento = {
      id: uid(),
      titulo: t,
      categoria,
      data,
      createdAt: Date.now(),
    };

    setEventos((prev) => [...prev, novo]);
    setTitulo("");
    setData("");
    setCategoria("Aniversário");
  };

  const removerEvento = (id: string) => {
    setEventos((prev) => prev.filter((e) => e.id !== id));
  };

  const agora = Date.now();
  const futuros = eventosOrdenados.filter((e) => {
    const ts = new Date(e.data).getTime();
    return Number.isFinite(ts) ? ts >= agora - 24 * 60 * 60 * 1000 : true; // tolerância 24h
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
        <p className="text-sm text-gray-600">Eventos guardados no dispositivo (offline).</p>
      </div>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Adicionar evento</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_220px_180px_120px]">
          <input
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
            placeholder="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") adicionarEvento();
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
            onClick={adicionarEvento}
            className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Adicionar
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Próximos eventos</h2>

        {futuros.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600 shadow-sm">Nenhum evento agendado.</div>
        ) : (
          <ul className="space-y-2">
            {futuros.map((e) => (
              <li key={e.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{e.titulo}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {e.categoria} · {new Date(e.data).toLocaleString("pt-PT")}
                    </div>
                  </div>
                  <button
                    onClick={() => removerEvento(e.id)}
                    className="w-fit rounded-xl border border-red-600 bg-red-600 px-3 py-2 text-sm text-white hover:opacity-90"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
