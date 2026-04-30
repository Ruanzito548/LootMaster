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
};

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
      className="loot-gold-button rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em]"
    >
      Exportar planilha
    </button>
  );
}
