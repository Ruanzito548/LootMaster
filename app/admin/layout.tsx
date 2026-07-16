import Link from "next/link";
import { ChevronDown, FolderPlus, Home, LayoutDashboard, Package, Settings, Sparkles, UserCog, Users, Wallet } from "lucide-react";
import { requireAuthenticatedAdminPage } from "@/lib/server-session-auth";

const adminNavItems = [
  { href: "/admin", label: "Central", icon: Home },
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/items", label: "Itens", icon: Package },
  { href: "/admin/games", label: "Configuracoes", icon: Settings },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAuthenticatedAdminPage();

  return (
    <div className="admin-dashboard-theme min-h-screen bg-[#0b0c10] text-green-200">
      <div className="flex w-full">
        <aside className="fixed left-0 top-20 z-30 hidden h-[calc(100vh-5rem)] w-[260px] border-r border-green-900/40 bg-black/80 p-4 lg:flex lg:flex-col">
          <div className="rounded-2xl border border-green-900/50 bg-green-950/20 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-green-500">Admin</p>
            <p className="mt-2 text-xl font-black text-green-200">Loot Master</p>
          </div>

          <nav className="mt-5 grid gap-1.5">
            {adminNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group inline-flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-green-300/80 transition hover:border-green-700/40 hover:bg-green-950/40 hover:text-green-200"
                >
                  <Icon className="h-4 w-4 text-green-500 group-hover:text-green-300" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <details className="group rounded-xl border border-transparent open:border-green-700/40 open:bg-green-950/20">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-green-300/80 transition hover:border-green-700/40 hover:bg-green-950/40 hover:text-green-200">
                <FolderPlus className="h-4 w-4 text-green-500 group-open:text-green-300" />
                <span className="flex-1">Cadastros</span>
                <ChevronDown className="h-4 w-4 text-green-500 transition-transform group-open:rotate-180" />
              </summary>

              <div className="mb-2 ml-4 mr-2 mt-1 grid gap-1 border-l border-green-900/50 pl-3">
                <Link
                  href="/admin/clientes/todos"
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-green-400/90 transition hover:bg-green-950/50 hover:text-green-200"
                >
                  <Users className="h-3.5 w-3.5" />
                  Clientes
                </Link>
                <Link
                  href="/admin/clientes/agentes"
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-green-400/90 transition hover:bg-green-950/50 hover:text-green-200"
                >
                  <UserCog className="h-3.5 w-3.5" />
                  Agentes
                </Link>
              </div>
            </details>

            <details className="group rounded-xl border border-transparent open:border-green-700/40 open:bg-green-950/20">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-green-300/80 transition hover:border-green-700/40 hover:bg-green-950/40 hover:text-green-200">
                <Sparkles className="h-4 w-4 text-green-500 group-open:text-green-300" />
                <span className="flex-1">Extras</span>
                <ChevronDown className="h-4 w-4 text-green-500 transition-transform group-open:rotate-180" />
              </summary>

              <div className="mb-2 ml-4 mr-2 mt-1 grid gap-1 border-l border-green-900/50 pl-3">
                <Link
                  href="/admin/calculadora-financeira"
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-green-400/90 transition hover:bg-green-950/50 hover:text-green-200"
                >
                  Calculadora Financeira
                </Link>
                <Link
                  href="/admin/chests"
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-green-400/90 transition hover:bg-green-950/50 hover:text-green-200"
                >
                  Config dos Baus
                </Link>
              </div>
            </details>

            <details className="group rounded-xl border border-transparent open:border-green-700/40 open:bg-green-950/20">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-green-300/80 transition hover:border-green-700/40 hover:bg-green-950/40 hover:text-green-200">
                <Wallet className="h-4 w-4 text-green-500 group-open:text-green-300" />
                <span className="flex-1">Extrato</span>
                <ChevronDown className="h-4 w-4 text-green-500 transition-transform group-open:rotate-180" />
              </summary>

              <div className="mb-2 ml-4 mr-2 mt-1 grid gap-1 border-l border-green-900/50 pl-3">
                <Link
                  href="/admin/orders/abertas"
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-green-400/90 transition hover:bg-green-950/50 hover:text-green-200"
                >
                  Ordens Abertas
                </Link>
                <Link
                  href="/admin/orders/completas"
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-green-400/90 transition hover:bg-green-950/50 hover:text-green-200"
                >
                  Ordens Completas
                </Link>
                <Link
                  href="/admin/withdrawals/aprovar"
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-green-400/90 transition hover:bg-green-950/50 hover:text-green-200"
                >
                  Aprovar Saque
                </Link>
                <Link
                  href="/admin/withdrawals/aprovados"
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-green-400/90 transition hover:bg-green-950/50 hover:text-green-200"
                >
                  Saques Aprovados
                </Link>
                <Link
                  href="/admin/withdrawals/rejeitados"
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-green-400/90 transition hover:bg-green-950/50 hover:text-green-200"
                >
                  Saques Rejeitados
                </Link>
                <Link
                  href="/admin/giftcard-claims/abertas"
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-green-400/90 transition hover:bg-green-950/50 hover:text-green-200"
                >
                  Reinvidicacoes de Gifcards Abertas
                </Link>
                <Link
                  href="/admin/giftcard-claims/completas"
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-green-400/90 transition hover:bg-green-950/50 hover:text-green-200"
                >
                  Reinvidicacoes de Gifcards Completas
                </Link>
              </div>
            </details>
          </nav>

          <div className="mt-auto rounded-2xl border border-green-900/50 bg-black/50 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-green-600">Painel</p>
            <p className="mt-1 text-xs text-green-300/80">Estrutura unificada com navegacao lateral e area central ampla.</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:ml-[260px]">
          <main className="px-4 py-5 lg:px-8">
            <div className="rounded-2xl border border-green-900/40 bg-[#111317] p-4 sm:p-5">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
