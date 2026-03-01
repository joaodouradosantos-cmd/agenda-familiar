
"use client";

// Página de tarefas com melhorias visuais e correção de gravação
// Esta versão chama automaticamente o endpoint de aceitação de convites e
// adiciona chips coloridos para cada categoria. Também aplica sombras
// suaves às caixas para uma aparência mais moderna.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Tipos de categoria de tarefas
type Categoria = "Casa" | "Compras" | "Trabalho" | "Saúde" | "Lazer" | "Outros";

// Tipo de tarefa recebido da base de dados
type DbTask = {
  id: string;
  description: string;
  category: Categoria;
  is_done: boolean;
  due_date: string | null; // YYYY-MM-DD
  created_at: string;
};

export default function TarefasPageAtualizada() {
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [tarefas, setTarefas] = useState<DbTask[]>([]);
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaCategoria, setNovaCategoria] = useState<Categoria>("Casa");
  const [novaData, setNovaData] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<Categoria | "Todas">("Todas");
  const [msg, setMsg] = useState<string | null>(null);

  // Lista de categorias disponíveis
  const categorias: Categoria[] = ["Casa", "Compras", "Trabalho", "Saúde", "Lazer", "Outros"];

  // Definição de cores para cada categoria (chips)
  const categoryColors: Record<Categoria, string> = {
    Casa: "bg-yellow-100 text-yellow-800",
    Compras: "bg-pink-100 text-pink-800",
    Trabalho: "bg-blue-100 text-blue-800",
    Saúde: "bg-green-100 text-green-800",
    Lazer: "bg-purple-100 text-purple-800",
    Outros: "bg-gray-100 text-gray-800",
  };

  // Sugestões de itens comuns para listas de compras.
  // Quando a categoria selecionada for "Compras", estas sugestões aparecerão como pequenos botões
  // que preenchem automaticamente a descrição ao serem clicados. Isso proporciona uma forma
  // rápida de inserir artigos comuns sem ter de digitá-los manualmente. Adicione ou remova
  // itens conforme necessário para a sua família.
  const sugestoesCompras = [
    "Leite",
    "Pão",
    "Ovos",
    "Arroz",
    "Frutas",
    "Vegetais",
    "Carne",
    "Peixe",
  ];

  // Carrega tarefas para a família do utilizador
  async function loadTasks() {
    setLoading(true);
    setMsg(null);

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      setLoading(false);
      setMsg("Sessão não encontrada. Faz login.");
      setTarefas([]);
      return;
    }

    // Garante que o utilizador está associado à família (auto-aceitação de convite)
    await fetch("/api/accept-invite", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    // Recupera dados do utilizador e família
    const meRes = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
    const me = await meRes.json();
    if (!me.familyId) {
      setFamilyId(null);
      setTarefas([]);
      setLoading(false);
      setMsg("Família não configurada (NEXT_PUBLIC_FAMILY_ID / FAMILY_ID).);");
      return;
    }
    setFamilyId(me.familyId);

    // Consulta tarefas ordenadas pela data (due_date) e data de criação
    const { data, error } = await supabase
      .from("tasks")
      .select("id, description, category, is_done, due_date, created_at")
      .eq("family_id", me.familyId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
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

  // Calcula lista filtrada e ordenada
  const tarefasVisiveis = useMemo(() => {
    const base =
      filtroCategoria === "Todas" ? tarefas : tarefas.filter((t) => t.category === filtroCategoria);
    return [...base].sort((a, b) => {
      const ad = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      if (ad !== bd) return ad - bd;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [tarefas, filtroCategoria]);

  // Adiciona uma nova tarefa
  async function adicionarTarefa() {
    const desc = novaDescricao.trim();
    if (!desc || !familyId) return;
    setMsg(null);
    const { error } = await supabase.from("tasks").insert({
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
    setNovaDescricao("");
    setNovaData("");
    setNovaCategoria("Casa");
    await loadTasks();
  }

  // Alterna estado de conclusão
  async function toggleConcluida(id: string, isDone: boolean) {
    setMsg(null);
    const { error } = await supabase.from("tasks").update({ is_done: !isDone }).eq("id", id);
    if (error) setMsg(error.message);
    else await loadTasks();
  }

  // Remove tarefa por id
  async function removerTarefa(id: string) {
    setMsg(null);
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) setMsg(error.message);
    else await loadTasks();
  }

  // Limpa todas as tarefas concluídas para esta família
  async function limparConcluidas() {
    if (!familyId) return;
    setMsg(null);
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("family_id", familyId)
      .eq("is_done", true);
    if (error) setMsg(error.message);
    else await loadTasks();
  }

  const total = tarefas.length;
  const feitas = tarefas.filter((t) => t.is_done).length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
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
            className="rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={tarefas.every((t) => !t.is_done)}
          >
            Limpar concluídas
          </button>
          <button
            onClick={loadTasks}
            className="rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
          >
            Atualizar
          </button>
        </div>
      </div>
      {/* Mensagem de erro ou informação */}
      {msg && <div className="rounded-xl border bg-white p-3 text-sm shadow-sm">{msg}</div>}
      {/* Formulário de nova tarefa */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-700">Descrição</label>
            {/* Se a categoria for Compras, usa textarea para permitir mais espaço de escrita */}
            {novaCategoria === "Compras" ? (
              <textarea
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                placeholder="Escreva os itens de compras..."
                rows={3}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            ) : (
              <input
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                placeholder="Ex.: Comprar leite"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            )}
            {/* Mostrar sugestões apenas para a categoria Compras */}
            {novaCategoria === "Compras" && (
              <div className="mt-2 flex flex-wrap gap-2">
                {sugestoesCompras.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setNovaDescricao(sug)}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs hover:bg-gray-200"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
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
            onClick={adicionarTarefa}
            className="rounded-xl bg-black px-4 py-2 text-sm text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            disabled={!novaDescricao.trim() || !familyId}
          >
            Adicionar
          </button>
        </div>
      </div>
      {/* Lista de tarefas */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-gray-600">A carregar…</p>
        ) : tarefasVisiveis.length === 0 ? (
          <p className="text-sm text-gray-600">Sem tarefas para mostrar.</p>
        ) : (
          <ul className="space-y-2">
            {tarefasVisiveis.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={t.is_done}
                      onChange={() => toggleConcluida(t.id, t.is_done)}
                    />
                    <span className={t.is_done ? "line-through text-gray-500" : ""}>{t.description}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-medium ${categoryColors[t.category]}`}
                    >
                      {t.category}
                    </span>
                    {t.due_date ? <span>{t.due_date}</span> : null}
                  </div>
                </div>
                <button
                  onClick={() => removerTarefa(t.id)}
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
