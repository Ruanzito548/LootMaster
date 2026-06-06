"use client";

import { ArrowDownLeft, ArrowUpRight, CircleDashed, Shield, Sparkles, Store, Wrench } from "lucide-react";

import type { ActivityCategory, ActivityHistoryLog } from "@/lib/activity-history-types";

type ActivityLogTableProps = {
  items: ActivityHistoryLog[];
  loadingMore?: boolean;
  emptyLabel?: string;
  showUserColumn?: boolean;
};

type RowSemantic = {
  action: string;
  source: string;
  result: string;
};

function isChestRelatedEvent(item: ActivityHistoryLog): boolean {
  const origin = item.origin.toLowerCase();
  const description = item.description.toLowerCase();
  const tags = item.tags.join(" ").toLowerCase();
  const itemCategory = (item.itemCategory ?? "").toLowerCase();

  return (
    origin.includes("chest") ||
    description.includes("chest") ||
    description.includes("bau") ||
    tags.includes("chest") ||
    itemCategory === "chest"
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return { day: "--/--/----", hour: "--:--" };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { day: "--/--/----", hour: "--:--" };
  }

  return {
    day: date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    hour: date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readMetaLabel(item: ActivityHistoryLog, key: string): string | null {
  const value = item.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function deriveAction(item: ActivityHistoryLog): string {
  const meta = readMetaLabel(item, "actionLabel");
  if (meta) {
    const normalizedMeta = meta.toLowerCase();
    if (normalizedMeta === "opened chest") return "Bau Aberto";
    if (normalizedMeta === "chest used") return "Bau Consumido";
    if (normalizedMeta === "crafted item") return "Item Criado";
    if (normalizedMeta === "materials consumed") return "Materiais Consumidos";
    if (normalizedMeta === "marketplace purchase") return "Compra no Marketplace";
    if (normalizedMeta === "sold item") return "Item Vendido";
    if (normalizedMeta === "listing removed") return "Anuncio Removido";
    if (normalizedMeta === "marketplace fee") return "Taxa do Marketplace";
    if (normalizedMeta === "admin granted") return "Concedido por Admin";
    if (normalizedMeta === "daily reward") {
      return isChestRelatedEvent(item) ? "Recebido de Bau" : "Recompensa Diaria";
    }

    return meta;
  }

  const action = item.actionType.toLowerCase();

  if (action === "chest_opened") return "Bau Aberto";
  if (action === "chest_used") return "Bau Consumido";
  if (action === "craft_completed") return "Item Criado";
  if (action === "craft_materials_consumed") return "Materiais Consumidos";
  if (action === "marketplace_item_bought") return "Compra no Marketplace";
  if (action === "marketplace_item_sold") return "Item Vendido";
  if (action === "marketplace_item_listed") return "Item Anunciado";
  if (action === "marketplace_listing_removed") return "Anuncio Removido";
  if (action === "marketplace_fee_charged") return "Taxa do Marketplace";
  if (action.startsWith("admin_")) return "Concedido por Admin";
  if (action.includes("reward")) return isChestRelatedEvent(item) ? "Recebido de Bau" : "Recompensa Diaria";

  return titleCase(item.actionType);
}

function deriveSource(item: ActivityHistoryLog): string {
  const meta = readMetaLabel(item, "sourceLabel");
  if (meta) {
    const normalizedMeta = meta.toLowerCase();
    if (normalizedMeta === "inventory") return "Inventario";
    if (normalizedMeta === "admin panel") return "Painel Admin";
    if (normalizedMeta === "crafting system") return "Sistema de Craft";
    return meta;
  }

  if (item.origin.includes("marketplace")) return "Marketplace";
  if (item.origin.includes("craft")) return "Sistema de Craft";
  if (item.origin.includes("chests")) return item.itemName ?? "Bau";
  if (item.origin.includes("admin")) return "Painel Admin";
  if (item.category === "inventory") return "Inventario";
  return titleCase(item.origin.replace(/:/g, " "));
}

function deriveResult(item: ActivityHistoryLog): string {
  const meta = readMetaLabel(item, "resultLabel");
  if (meta) {
    return meta;
  }

  if (item.itemName && item.quantity && item.quantity > 1) {
    return `${item.itemName} x${item.quantity}`;
  }

  if (item.itemName) {
    return item.itemName;
  }

  if (typeof item.value === "number" && item.valueUnit === "loot") {
    return `${item.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} Loot Coins`;
  }

  return item.description;
}

function deriveSemantic(item: ActivityHistoryLog): RowSemantic {
  return {
    action: deriveAction(item),
    source: deriveSource(item),
    result: deriveResult(item),
  };
}

function isNegativeFlow(item: ActivityHistoryLog): boolean {
  const action = item.actionType.toLowerCase();
  return (
    item.status === "failed" ||
    item.status === "rejected" ||
    item.status === "consumed" ||
    action.includes("fee") ||
    action.includes("consumed") ||
    action.includes("listed") ||
    action.includes("buy") ||
    action.includes("withdraw")
  );
}

function getAmountText(item: ActivityHistoryLog): string {
  const sign = isNegativeFlow(item) ? "-" : "+";

  if (typeof item.value === "number" && item.valueUnit) {
    if (item.valueUnit === "loot") {
      return `${sign}${item.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} LC`;
    }

    if (item.valueUnit === "usd") {
      return `${sign}$${item.value.toFixed(2)}`;
    }

    if (item.valueUnit === "xp") {
      return `${sign}${item.value.toFixed(2)} XP`;
    }
  }

  if (item.itemName) {
    return `${sign}${item.quantity ?? 1} ${item.itemName}`;
  }

  if (typeof item.quantity === "number") {
    return `${sign}${item.quantity}`;
  }

  return "--";
}

function getCategoryTheme(category: ActivityCategory, action: string) {
  const normalizedAction = action.toLowerCase();

  if (normalizedAction.includes("opened chest") || category === "chests") {
    return {
      accent: "before:bg-cyan-400/85",
      badge: "border-cyan-300/35 bg-cyan-500/16 text-cyan-100",
      icon: Sparkles,
    };
  }

  if (normalizedAction.includes("used") || normalizedAction.includes("consumed") || category === "inventory") {
    return {
      accent: "before:bg-rose-400/85",
      badge: "border-rose-300/35 bg-rose-500/16 text-rose-100",
      icon: ArrowUpRight,
    };
  }

  if (category === "marketplace") {
    return {
      accent: "before:bg-violet-400/85",
      badge: "border-violet-300/35 bg-violet-500/16 text-violet-100",
      icon: Store,
    };
  }

  if (category === "admin") {
    return {
      accent: "before:bg-amber-300/85",
      badge: "border-amber-300/40 bg-amber-500/18 text-amber-100",
      icon: Shield,
    };
  }

  if (category === "crafting") {
    return {
      accent: "before:bg-orange-400/85",
      badge: "border-orange-300/35 bg-orange-500/16 text-orange-100",
      icon: Wrench,
    };
  }

  if (category === "economy" || category === "progression") {
    return {
      accent: "before:bg-emerald-400/85",
      badge: "border-emerald-300/35 bg-emerald-500/16 text-emerald-100",
      icon: ArrowDownLeft,
    };
  }

  return {
    accent: "before:bg-slate-300/45",
    badge: "border-slate-300/25 bg-slate-500/16 text-slate-100",
    icon: CircleDashed,
  };
}

function getStatusTone(status: string) {
  if (status === "completed" || status === "approved") return "border-emerald-300/35 bg-emerald-500/16 text-emerald-100";
  if (status === "consumed") return "border-rose-300/35 bg-rose-500/16 text-rose-100";
  if (status === "admin_action") return "border-amber-300/45 bg-amber-500/18 text-amber-100";
  if (status === "pending") return "border-yellow-300/35 bg-yellow-500/16 text-yellow-100";
  if (status === "failed" || status === "rejected") return "border-red-400/42 bg-red-600/20 text-red-100";
  if (status === "cancelled") return "border-slate-300/25 bg-slate-500/16 text-slate-100";
  return "border-sky-300/35 bg-sky-500/16 text-sky-100";
}

function formatStatus(status: string): string {
  if (status === "admin_action") return "Acao Admin";
  if (status === "completed") return "Concluido";
  if (status === "consumed") return "Consumido";
  if (status === "pending") return "Pendente";
  if (status === "approved") return "Aprovado";
  if (status === "rejected") return "Rejeitado";
  if (status === "failed") return "Falhou";
  if (status === "cancelled") return "Cancelado";
  if (status === "system") return "Sistema";
  return titleCase(status);
}

export function ActivityLogTable({ items, loadingMore = false, emptyLabel = "Nenhum registro encontrado.", showUserColumn = false }: ActivityLogTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-black/20 px-6 py-10 text-center text-sm font-semibold text-[#9db7d4]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.7rem] border border-white/12 bg-[#060f1a]/95 shadow-[0_22px_64px_rgba(0,0,0,0.32)]">
      <div className="max-h-[72vh] overflow-auto">
        <table className="min-w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[130px]" />
            {showUserColumn ? <col className="w-[210px]" /> : null}
            <col className="w-[170px]" />
            <col className="w-[160px]" />
            <col className="w-[250px]" />
            <col className="w-[170px]" />
            <col className="w-[130px]" />
            <col className="w-[130px]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-[linear-gradient(180deg,rgba(10,19,32,0.98),rgba(8,15,27,0.97))] backdrop-blur">
            <tr className="border-b border-white/10 text-[0.64rem] font-black uppercase tracking-[0.18em] text-[#8fb0d2]">
              <th className="px-4 py-3">Data</th>
              {showUserColumn ? <th className="px-4 py-3">Usuario</th> : null}
              <th className="px-4 py-3">Acao</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Resultado</th>
              <th className="px-4 py-3">Referencia</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const semantic = deriveSemantic(item);
              const date = formatDateTime(item.createdAt);
              const theme = getCategoryTheme(item.category, semantic.action);
              const ActionIcon = theme.icon;
              const negative = isNegativeFlow(item);

              return (
                <tr
                  key={item.id}
                  className={`group relative h-[66px] border-b border-white/7 align-middle transition hover:bg-white/[0.05] ${theme.accent} before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:content-['']`}
                >
                  <td className="px-4 py-2 align-middle">
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold text-[#dbe8f8]">{date.day}</span>
                      <span className="text-xs font-semibold text-[#8fb0d2]">{date.hour}</span>
                    </div>
                  </td>

                  {showUserColumn ? (
                    <td className="px-4 py-2 align-middle">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#e6f1ff]">{item.relatedUserName ?? item.userUid}</div>
                        <div className="truncate font-mono text-[0.67rem] text-[#8fb0d2]">{item.userUid}</div>
                      </div>
                    </td>
                  ) : null}

                  <td className="px-4 py-2 align-middle">
                    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] ${theme.badge}`}>
                      <ActionIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{semantic.action}</span>
                    </span>
                  </td>

                  <td className="px-4 py-2 align-middle">
                    <div className="truncate font-semibold text-[#c7daef]">{semantic.source}</div>
                  </td>

                  <td className="px-4 py-2 align-middle">
                    <div className="truncate font-semibold text-[#f3f8ff]">{semantic.result}</div>
                    <div className="truncate text-[0.67rem] font-semibold text-[#8da8c8]">{item.description}</div>
                  </td>

                  <td className="px-4 py-2 align-middle">
                    <div className="truncate rounded-md border border-white/12 bg-black/25 px-2 py-1 font-mono text-[0.67rem] text-[#9bb8d8]">{item.reference}</div>
                  </td>

                  <td className={`px-4 py-2 text-right align-middle font-black ${negative ? "text-rose-300" : "text-emerald-300"}`}>
                    <span className="inline-flex items-center justify-end gap-1">
                      {negative ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                      {getAmountText(item)}
                    </span>
                  </td>

                  <td className="px-4 py-2 align-middle">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] ${getStatusTone(item.status)}`}>
                      {formatStatus(item.status)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center border-t border-white/8 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#8ea9c8]">
          <CircleDashed className="h-3.5 w-3.5" />
          {loadingMore ? "Carregando mais linhas" : `${items.length} linhas carregadas`}
        </span>
      </div>
    </div>
  );
}
