"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ChecklistItem = {
  id: string;
  text: string;
  description: string;
  done: boolean;
  createdAt: number;
};

const STORAGE_KEY = "admin-checklist-items-v1";

function generateItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isChecklistItem(value: unknown): value is ChecklistItem {
  if (!value || typeof value !== "object") return false;

  const row = value as ChecklistItem;
  return (
    typeof row.id === "string" &&
    typeof row.text === "string" &&
    typeof row.description === "string" &&
    typeof row.done === "boolean" &&
    typeof row.createdAt === "number"
  );
}

function normalizeChecklistItem(value: unknown): ChecklistItem | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Partial<ChecklistItem>;
  if (typeof row.id !== "string") return null;
  if (typeof row.text !== "string") return null;
  if (typeof row.done !== "boolean") return null;
  if (typeof row.createdAt !== "number") return null;

  return {
    id: row.id,
    text: row.text,
    description: typeof row.description === "string" ? row.description : "",
    done: row.done,
    createdAt: row.createdAt,
  };
}

type FilterMode = "all" | "pending" | "done";

export function AdminChecklistClient() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [isLoaded, setIsLoaded] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setIsLoaded(true);
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setIsLoaded(true);
        return;
      }

      const recovered = parsed
        .map(normalizeChecklistItem)
        .filter((row): row is ChecklistItem => row !== null)
        .sort((a, b) => b.createdAt - a.createdAt);
      setItems(recovered);
    } catch {
      // Ignore malformed values and start with an empty checklist.
      setItems([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, isLoaded]);

  const totalItems = items.length;
  const doneItems = items.filter((item) => item.done).length;
  const pendingItems = totalItems - doneItems;

  const visibleItems = useMemo(() => {
    if (filterMode === "pending") return items.filter((item) => !item.done);
    if (filterMode === "done") return items.filter((item) => item.done);
    return items;
  }, [items, filterMode]);

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    const newItem: ChecklistItem = {
      id: generateItemId(),
      text: trimmedValue,
      description: descriptionValue.trim(),
      done: false,
      createdAt: Date.now(),
    };

    setItems((prev) => [newItem, ...prev]);
    setInputValue("");
    setDescriptionValue("");
  }

  function toggleItem(itemId: string) {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)));
  }

  function removeItem(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  function clearDoneItems() {
    setItems((prev) => prev.filter((item) => !item.done));
  }

  function updateItemDescription(itemId: string, description: string) {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, description } : item)));
  }

  function toggleDescriptionPanel(itemId: string) {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  }

  return (
    <div className="rounded-2xl border border-green-900 bg-green-950/10 p-5 shadow-[0_20px_50px_-35px_rgba(34,197,94,0.6)] sm:p-6">
      <form onSubmit={addItem} className="space-y-3">
        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Ex.: Revisar pedidos pendentes"
          className="w-full rounded-lg border border-green-800 bg-black px-4 py-3 text-sm text-green-200 outline-none transition placeholder:text-green-700 focus:border-green-500"
          maxLength={120}
        />
        <textarea
          value={descriptionValue}
          onChange={(event) => setDescriptionValue(event.target.value)}
          placeholder="Descricao (opcional): cole aqui prompts, contexto e observacoes"
          className="min-h-[90px] w-full rounded-lg border border-green-800 bg-black px-4 py-3 text-sm text-green-200 outline-none transition placeholder:text-green-700 focus:border-green-500"
          maxLength={2500}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg border border-green-600 bg-green-900/60 px-5 py-3 text-sm font-semibold text-green-200 transition hover:bg-green-800"
          >
            Adicionar
          </button>
        </div>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-green-600">
        <p>
          Total: {totalItems} | Pendentes: {pendingItems} | Concluidas: {doneItems}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`rounded-md border px-3 py-1.5 transition ${
              filterMode === "all"
                ? "border-green-500 bg-green-950 text-green-300"
                : "border-green-900 text-green-600 hover:border-green-700"
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("pending")}
            className={`rounded-md border px-3 py-1.5 transition ${
              filterMode === "pending"
                ? "border-green-500 bg-green-950 text-green-300"
                : "border-green-900 text-green-600 hover:border-green-700"
            }`}
          >
            Pendentes
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("done")}
            className={`rounded-md border px-3 py-1.5 transition ${
              filterMode === "done"
                ? "border-green-500 bg-green-950 text-green-300"
                : "border-green-900 text-green-600 hover:border-green-700"
            }`}
          >
            Concluidas
          </button>
          <button
            type="button"
            onClick={clearDoneItems}
            disabled={doneItems === 0}
            className="rounded-md border border-green-900 px-3 py-1.5 text-green-600 transition enabled:hover:border-green-700 enabled:hover:text-green-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Limpar concluidas
          </button>
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {visibleItems.length === 0 ? (
          <li className="rounded-xl border border-dashed border-green-900 bg-black/50 px-4 py-6 text-center text-sm text-green-700">
            {isLoaded ? "Nenhuma tarefa nesse filtro." : "Carregando checklist..."}
          </li>
        ) : (
          visibleItems.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-green-900 bg-black/70 px-3 py-2.5 sm:px-4"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleItem(item.id)}
                  className="h-4 w-4 rounded border-green-700 bg-black text-green-500"
                />
                <span className={`flex-1 text-sm ${item.done ? "text-green-700 line-through" : "text-green-200"}`}>
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => toggleDescriptionPanel(item.id)}
                  className="rounded-md border border-green-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-green-600 transition hover:border-green-700 hover:text-green-400"
                >
                  {expandedDescriptions[item.id] ? "Ocultar descricao" : "Descricao"}
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="rounded-md border border-green-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-green-600 transition hover:border-green-700 hover:text-green-400"
                >
                  Remover
                </button>
              </div>

              {expandedDescriptions[item.id] ? (
                <div className="pt-3">
                  <textarea
                    value={item.description}
                    onChange={(event) => updateItemDescription(item.id, event.target.value)}
                    placeholder="Adicione detalhes, prompts e instrucoes para esta tarefa"
                    className="min-h-[120px] w-full rounded-lg border border-green-900 bg-black px-3 py-2 text-sm text-green-200 outline-none transition placeholder:text-green-700 focus:border-green-600"
                    maxLength={4000}
                  />
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}