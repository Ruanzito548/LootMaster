"use client";

export type OrderRow = {
  id: string;
  created: string;
  createdAtIso: string | null;
  status: string;
  agentName: string;
  agentEmail: string;
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
  baseProductCents: number;
  supplierName: string;
  supplierPercentage: number;
  supplierPayout: number;
  grossProfit: number;
  netProfit: number;
};

function formatMoney(cents: number, currencyCode: string): string {
  const currency = currencyCode.trim().toUpperCase();
  const supportedCurrency = currency === "BRL" || currency === "EUR" ? currency : "USD";
  const locale = supportedCurrency === "BRL" ? "pt-BR" : supportedCurrency === "EUR" ? "de-DE" : "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: supportedCurrency,
  }).format(cents / 100);
}

export default function OrdersExportButton({ orders }: { orders: OrderRow[] }) {
  function handleExport() {
    const headers = [
      "ID",
      "Data",
      "Status",
      "Parceiro",
      "E-mail do parceiro",
      "Nickname",
      "Email",
      "Jogo",
      "Categoria",
      "Gold",
      "Servidor",
      "Valor",
      "Repasse",
      "Lucro Bruto",
      "Lucro Líquido",
      "Fornecedor",
      "Fornecedor %",
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
        o.agentName,
        o.agentEmail,
        o.nickname,
        o.email,
        o.gameTitle,
        o.categoryTitle,
        o.goldAmount,
        o.server,
        formatMoney(o.totalCents, o.currency),
        formatMoney(o.supplierPayout, o.currency),
        formatMoney(o.grossProfit, o.currency),
        formatMoney(o.netProfit, o.currency),
        o.supplierName,
        `${o.supplierPercentage}%`,
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
