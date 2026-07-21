import Link from "next/link";

const adminSections = [
  {
    id: "01",
    title: "Dashboard",
    description: "Monitoramento financeiro e visão geral em tempo real.",
    href: "/admin/dashboard",
  },
  {
    id: "02",
    title: "Orders",
    description: "Gerencie pedidos, repasses e edição de percentuais dos fornecedores.",
    href: "/admin/orders",
  },
  {
    id: "03",
    title: "Saques",
    description: "Aprove ou rejeite solicitações de saque dos fornecedores.",
    href: "/admin/withdrawals",
  },
  {
    id: "04",
    title: "Manage hots",
    description: "Control which games appear in the highlighted section.",
    href: "/admin/manage-hots",
  },
  {
    id: "05",
    title: "Games",
    description: "Choose the game and service type to edit settings.",
    href: "/admin/games",
  },
  {
    id: "06",
    title: "Itens",
    description: "Consulte loot tables, recompensas por nivel e utilitarios do inventario.",
    href: "/admin/items",
  },
  {
    id: "07",
    title: "Clientes",
    description: "Manage client-agent links and promote clients to agents.",
    href: "/admin/clientes",
  },
  {
    id: "08",
    title: "Taxas",
    description: "Track fee routing between agents and LootMaster for each purchase.",
    href: "/admin/taxas",
  },
  {
    id: "09",
    title: "History",
    description: "Global spreadsheet-style logs for all users, references and suspicious activity.",
    href: "/admin/history",
  },
  {
    id: "10",
    title: "Chest Rewards",
    description: "Balance chest odds, Gift Card Fragment rates, and account drops by rarity.",
    href: "/admin/chests",
  },
  {
    id: "11",
    title: "Ajustes Financeiros",
    description: "Simulate sales distribution, persist percentages, and validate financial splits.",
    href: "/admin/calculadora-financeira",
  },
];

export default function AdminPage() {
  return (
    <div className="text-green-300">
      <div className="rounded-2xl border border-green-900/45 bg-black/20 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-green-600">Central</p>
            <h1 className="mt-1 text-3xl font-black text-green-200 sm:text-4xl">Painel Administrativo</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-green-700/60 bg-green-500/90 px-4 py-2 text-sm font-black text-black transition hover:brightness-105"
            >
              Imprimir
            </button>
            <button
              type="button"
              className="rounded-lg border border-green-700/60 bg-green-500/90 px-4 py-2 text-sm font-black text-black transition hover:brightness-105"
            >
              Download
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[220px_220px_180px_1fr]">
          <input
            type="text"
            placeholder="Data inicial"
            className="rounded-lg border border-green-900/50 bg-black/40 px-3 py-2 text-sm text-green-200 outline-none placeholder:text-green-700 focus:border-green-600"
          />
          <input
            type="text"
            placeholder="Data final"
            className="rounded-lg border border-green-900/50 bg-black/40 px-3 py-2 text-sm text-green-200 outline-none placeholder:text-green-700 focus:border-green-600"
          />
          <button
            type="button"
            className="rounded-lg border border-green-700/60 bg-green-600/85 px-4 py-2 text-sm font-black text-black transition hover:brightness-105"
          >
            Filtrar
          </button>
          <input
            type="text"
            placeholder="Pesquisar secao"
            className="rounded-lg border border-green-900/50 bg-black/40 px-3 py-2 text-sm text-green-200 outline-none placeholder:text-green-700 focus:border-green-600"
          />
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-green-900/50">
          <div className="grid grid-cols-[70px_220px_1fr_160px_120px] gap-3 bg-green-900/35 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-green-200">
            <span>ID</span>
            <span>Secao</span>
            <span>Descricao</span>
            <span>Status</span>
            <span>Acao</span>
          </div>

          <div className="divide-y divide-green-950/70 bg-black/30">
            {adminSections.map((section) => (
              <div key={section.id} className="grid grid-cols-[70px_220px_1fr_160px_120px] gap-3 px-3 py-3 text-sm">
                <span className="font-bold text-green-500">{section.id}</span>
                <span className="font-semibold text-green-200">{section.title}</span>
                <span className="text-green-400/90">{section.description}</span>
                <span className="inline-flex h-fit w-fit rounded-full border border-green-700/60 bg-green-600/25 px-2 py-0.5 text-xs font-bold text-green-300">
                  Ativo
                </span>
                <Link
                  href={section.href}
                  className="inline-flex h-fit w-fit rounded-md border border-green-700/60 bg-green-500/90 px-3 py-1 text-xs font-black text-black transition hover:brightness-105"
                >
                  Abrir
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Link
            href="/"
            className="inline-flex rounded-md border border-green-800 px-5 py-2.5 text-sm font-semibold text-green-400 transition hover:bg-green-950"
          >
            Voltar para home
          </Link>
        </div>
      </div>
    </div>
  );
}
