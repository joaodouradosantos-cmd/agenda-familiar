"use client";

import { useEffect, useMemo, useState } from "react";

type Categoria = "Casa" | "Compras" | "Trabalho" | "Saúde" | "Lazer" | "Outros";

interface Task {
  id: string;
  descricao: string;
  categoria: Categoria;
  concluida: boolean;
  data?: string; // YYYY-MM-DD
  createdAt: number;
}

const STORAGE_KEY = "agenda_familiar_tasks_v1";

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

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Task[]>([]);
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaCategoria, setNovaCategoria] = useState<Categoria>("Casa");
  const [novaData, setNovaData] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<Categoria | "Todas">("Todas");

  const categorias: Categoria[] = ["Casa", "Compras", "Trabalho", "Saúde", "Lazer", "Outros"];

  // Carrega do localStorage
  useEffect(() => {
    const stored = safeParse<Task[]>(typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null);
    if (stored && Array.isArray(stored)) {
      setTarefas(
        stored
          .filter((t) => t && typeof t === "object")
          .map((t) => ({
            id: String((t as any).id ?? uid()),
            descricao: String((t as any).descricao ?? ""),
            categoria: (t as any).categoria as Categoria,
            concluida: Boolean((t as any).concluida),
            data: (t as any).data ? String((t as any).data) : undefined,
            createdAt: Number((t as any).createdAt ?? Date.now()),
          }))
          .filter((t) => t.descricao.trim().length > 0),
      );
    }
  }, []);

  // Guarda no localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tarefas));
  }, [tarefas]);

  const tarefasVisiveis = useMemo(() => {
    const base = filtroCategoria === "Todas" ? tarefas : tarefas.filter((t) => t.categoria === filtroCategoria);
    return [...base].sort((a, b) => {
      // Prioriza por data (quando existe), depois por criação
      const ad = a.data ? new Date(a.data).getTime() : Number.MAX_SAFE_INTEGER;
      const bd = b.data ? new Date(b.data).getTime() : Number.MAX_SAFE_INTEGER;
      if (ad !== bd) return ad - bd;
      return a.createdAt - b.createdAt;
    });
  }, [tarefas, filtroCategoria]);

  const adicionarTarefa = () => {
    const desc = novaDescricao.trim();
    if (!desc) return;

    const nova: Task = {
      id: uid(),
      descricao: desc,
      categoria: novaCategoria,
      concluida: false,
      data: novaData || undefined,
      createdAt: Date.now(),
    };

    setTarefas((prev) => [...prev, nova]);
    setNovaDescricao("");
    setNovaData("");
    setNovaCategoria("Casa");
  };

  const toggleConcluida = (id: string) => {
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, concluida: !t.concluida } : t)));
  };

  const removerTarefa = (id: string) => {
    setTarefas((prev) => prev.filter((t) => t.id !== id));
  };

  const limparConcluidas = () => {
    setTarefas((prev) => prev.filter((t) => !t.concluida));
  };

  const total = tarefas.length;
  const feitas = tarefas.filter((t) => t.concluida).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-sm text-gray-600">
            {total === 0 ? "Sem tarefas." : `${feitas} concluída(s) em ${total}.`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={limparConcluidas}
            className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={feitas === 0}
          >
            Limpar concluídas
          </button>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Adicionar tarefa</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_180px_160px_120px]">
          <input
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
            placeholder="Descrição"
            value={novaDescricao}
            onChange={(e) => setNovaDescricao(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") adicionarTarefa();
            }}
          />
          <input
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
            type="date"
            value={novaData}
            onChange={(e) => setNovaData(e.target.value)}
          />
          <select
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value as Categoria)}
          >
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={adicionarTarefa}
            className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Adicionar
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Filtrar</h2>
          <div className="text-xs text-gray-500">Guardado no dispositivo (offline).</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["Todas", ...categorias] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={
                "rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50 " +
                (filtroCategoria === cat ? "bg-black text-white hover:bg-black" : "bg-white")
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Lista</h2>

        {tarefasVisiveis.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600 shadow-sm">
            Nenhuma tarefa encontrada.
          </div>
        ) : (
          <ul className="space-y-2">
            {tarefasVisiveis.map((t) => (
              <li key={t.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className={"font-medium " + (t.concluida ? "line-through text-gray-500" : "")}>{t.descricao}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {t.categoria}
                      {t.data ? ` · ${new Date(t.data).toLocaleDateString("pt-PT")}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleConcluida(t.id)}
                      className={
                        "rounded-xl border px-3 py-2 text-sm " +
                        (t.concluida ? "bg-green-600 text-white border-green-600" : "bg-white hover:bg-gray-50")
                      }
                    >
                      {t.concluida ? "Concluída" : "Concluir"}
                    </button>
                    <button
                      onClick={() => removerTarefa(t.id)}
                      className="rounded-xl border border-red-600 bg-red-600 px-3 py-2 text-sm text-white hover:opacity-90"
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
