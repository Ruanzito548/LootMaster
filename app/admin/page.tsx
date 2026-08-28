import Link from "next/link";
import { ArrowRight, BarChart3, Box, BriefcaseBusiness, Crown, LayoutGrid, Search, ShieldCheck, Wallet2 } from "lucide-react";

const adminSections = [
  {
    id: "01",
    title: "Dashboard",
    description: "Monitoramento financeiro e visão geral em tempo real.",
    href: "/admin/dashboard",
    icon: BarChart3,
  },
  {
    id: "02",
    title: "Orders",
    description: "Gerencie pedidos, repasses e edição de percentuais dos fornecedores.",
    href: "/admin/orders",
    icon: BriefcaseBusiness,
  },
  {
    id: "03",
    title: "Saques",
    description: "Aprove ou rejeite solicitações de saque dos fornecedores.",
    href: "/admin/withdrawals",
    icon: Wallet2,
  },
  {
    id: "04",
    title: "Manage hots",
    description: "Controle os jogos destacados na seção principal.",
    href: "/admin/manage-hots",
    icon: LayoutGrid,
  },
  {
    id: "05",
    title: "Games",
    description: "Escolha o jogo e o tipo de serviço para editar configurações.",
    href: "/admin/games",
    icon: Crown,
  },
  {
    id: "06",
    title: "Itens",
    description: "Consulte loot tables, recompensas por nível e utilitários do inventário.",
    href: "/admin/items",
    icon: Box,
  },
  {
    id: "07",
    title: "Clientes",
    description: "Gerencie vínculos cliente-parceiro e promova clientes para parceiros.",
    href: "/admin/clientes",
    icon: ShieldCheck,
  },
  {
    id: "08",
    title: "Comissões de Parceiros",
    description: "Acompanhe os repasses reais recebidos pelos parceiros e pela LootMaster em cada compra.",
    href: "/admin/taxas",
    icon: Wallet2,
  },
  {
    id: "09",
    title: "History",
    description: "Logs globais em estilo planilha para todos os usuários e atividades suspeitas.",
    href: "/admin/history",
    icon: BarChart3,
  },
  {
    id: "10",
    title: "Chest Rewards",
    description: "Equilibre odds de baús, taxas de fragmentos e drops por raridade.",
    href: "/admin/chests",
    icon: Box,
  },
  {
    id: "11",
    title: "Ajustes Financeiros",
    description: "Simule distribuições, persista percentuais e valide splits financeiros.",
    href: "/admin/calculadora-financeira",
    icon: BarChart3,
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-5 text-green-300">
      <section className="overflow-hidden rounded-[28px] border border-green-900/50 bg-[radial-gradient(circle_at_top_left,_rgba(74,222,128,0.18),_transparent_30%),linear-gradient(135deg,_rgba(20,31,24,0.9),_rgba(10,14,19,0.95))] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-green-500">Central</p>
            <h1 className="mt-2 text-3xl font-black text-green-200 sm:text-4xl">Painel Administrativo</h1>
            <p className="mt-3 text-sm text-green-400/80 sm:text-base">
              Acompanhe operações, ajuste regras e mantenha os fluxos da plataforma sob controle em um único ambiente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-green-700/60 bg-green-500/90 px-4 py-2 text-sm font-black text-black transition hover:brightness-105"
            >
              Imprimir
            </button>
            <button
              type="button"
              className="rounded-xl border border-green-700/60 bg-green-500/90 px-4 py-2 text-sm font-black text-black transition hover:brightness-105"
            >
              Download
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-green-900/50 bg-black/35 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-green-500">Seções ativas</p>
            <p className="mt-2 text-2xl font-black text-green-200">{adminSections.length}</p>
          </div>
          <div className="rounded-2xl border border-green-900/50 bg-black/35 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-green-500">Status geral</p>
            <p className="mt-2 text-2xl font-black text-green-200">Operando</p>
          </div>
          <div className="rounded-2xl border border-green-900/50 bg-black/35 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-green-500">Última atualização</p>
            <p className="mt-2 text-2xl font-black text-green-200">Hoje</p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-green-900/50 bg-black/25 p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-green-500">Acesso rápido</p>
            <h2 className="mt-1 text-2xl font-black text-green-200">Seções administrativas</h2>
          </div>

          <label className="flex items-center gap-2 rounded-2xl border border-green-900/50 bg-black/40 px-3 py-2 text-sm text-green-400/80 sm:min-w-[280px]">
            <Search className="h-4 w-4 text-green-500" />
            <input
              type="text"
              placeholder="Pesquisar seção"
              className="w-full bg-transparent outline-none placeholder:text-green-700"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {adminSections.map((section) => {
            const Icon = section.icon;

            return (
              <Link
                key={section.id}
                href={section.href}
                className="group rounded-2xl border border-green-900/50 bg-gradient-to-br from-green-950/45 to-black/50 p-4 transition hover:-translate-y-1 hover:border-green-700/60 hover:bg-green-950/50"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-xl border border-green-800/70 bg-green-500/10 p-2 text-green-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="rounded-full border border-green-700/50 bg-green-600/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-green-300">
                    Ativo
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-black text-green-200">{section.title}</h3>
                <p className="mt-2 text-sm leading-6 text-green-400/85">{section.description}</p>

                <div className="mt-4 flex items-center justify-between text-sm font-semibold text-green-400 transition group-hover:text-green-200">
                  <span>Abrir painel</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-5">
          <Link
            href="/"
            className="inline-flex rounded-xl border border-green-800 px-5 py-2.5 text-sm font-semibold text-green-400 transition hover:bg-green-950"
          >
            Voltar para home
          </Link>
        </div>
      </section>
    </div>
  );
}
