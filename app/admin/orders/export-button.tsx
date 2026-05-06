"use client";

export type OrderRow = {
  id: string;
  created: string;
  status: string;
  nickname: string;
  email: string;
  gameTitle: string;
  categoryTitle: string;
  goldAmount: string;
  server: string;
  faction: string;
  deliveryMethod: string;
  paymentMethod: string;
  total: string;
  currency: string;
  totalCents: number;
  commissionPercent: number;
  sellerAmountCents: number;
  platformProfitCents: number;
};

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function OrdersExportButton({ orders }: { orders: OrderRow[] }) {
  function handleExport() {
    const headers = [
      "ID",
      "Data",
      "Status",
      "Nickname",
      "Email",
      "Jogo",
      "Categoria",
      "Gold",
      "Servidor",
      "Valor",
      "Repasse",
      "Lucro",
      "Taxa",
      "Faction",
      "Entrega",
      "Pagamento",
      "Total",
    ];

    const rows = orders.map((o) =>
      [
        o.id,
        o.created,
        o.status,
        o.nickname,
        o.email,
        o.gameTitle,
        o.categoryTitle,
        o.goldAmount,
        o.server,
        formatMoney(o.totalCents, o.currency),
        formatMoney(o.sellerAmountCents, o.currency),
        formatMoney(o.platformProfitCents, o.currency),
        `${o.commissionPercent}%`,
        o.faction,
        o.deliveryMethod,
        o.paymentMethod,
        o.total,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="rounded-md border border-green-700 bg-black px-4 py-2 text-xs font-semibold uppercase tracking-wide text-green-400 transition hover:bg-green-950"
    >
      Exportar planilha
    </button>
  );
}
