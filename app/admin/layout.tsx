import Link from "next/link";
import { ChevronDown, FolderPlus, LayoutDashboard, Package, Settings, UserCog, Users, Wallet } from "lucide-react";
import { requireAuthenticatedAdminPage } from "@/lib/server-session-auth";

const adminNavItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/items", label: "Itens", icon: Package },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAuthenticatedAdminPage();

  return (
    <div className="admin-dashboard-theme min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_28%),linear-gradient(135deg,_#060816_0%,_#0b1118_40%,_#070b10_100%)] text-green-200">
      <div className="flex w-full">
        <aside className="fixed left-0 top-20 z-30 hidden h-[calc(100vh-5rem)] w-[320px] bg-black/70 p-5 shadow-[0_0_60px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:flex lg:flex-col">
          <div className="rounded-2xl bg-gradient-to-br from-green-950/70 to-black/70 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-green-500">Admin</p>
            <p className="mt-2 text-xl font-black text-green-200">Loot Master</p>
            <p className="mt-2 text-sm text-green-400/70">Centro de controle operacional</p>
          </div>

          <nav className="mt-6 grid gap-2">
            {adminNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group inline-flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-green-300/80 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  <Icon className="h-5 w-5 text-green-500 transition-colors duration-200 group-hover:text-green-300" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <details className="group rounded-xl open:bg-green-950/20">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-green-300/80 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200">
                <FolderPlus className="h-5 w-5 text-green-500 transition-colors duration-200 group-open:text-green-300" />
                <span className="flex-1">Cadastros</span>
                <ChevronDown className="h-5 w-5 text-green-500 transition-transform duration-200 group-open:rotate-180" />
              </summary>

              <div className="mb-2 ml-5 mr-2 mt-1 grid gap-1 pl-3">
                <Link
                  href="/admin/clientes/todos"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-green-400/90 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  <Users className="h-3.5 w-3.5" />
                  Clientes
                </Link>
                <Link
                  href="/admin/clientes/agentes"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-green-400/90 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  <UserCog className="h-3.5 w-3.5" />
                  Agentes
                </Link>
              </div>
            </details>

            <details className="group rounded-xl open:bg-green-950/20">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-green-300/80 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200">
                <Settings className="h-5 w-5 text-green-500 transition-colors duration-200 group-open:text-green-300" />
                <span className="flex-1">Configurações</span>
                <ChevronDown className="h-5 w-5 text-green-500 transition-transform duration-200 group-open:rotate-180" />
              </summary>

              <div className="mb-2 ml-5 mr-2 mt-1 grid gap-1 pl-3">
                <Link
                  href="/admin/game-configuration"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-green-400/90 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  Game Configuration
                </Link>
                <Link
                  href="/admin/chests"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-green-400/90 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  Config dos Baus
                </Link>
                <Link
                  href="/admin/calculadora-financeira"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-green-400/90 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  Ajustes Financeiros
                </Link>
                <Link
                  href="/admin/discord-settings"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-green-400/90 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  Configurações Discord
                </Link>
              </div>
            </details>

            <details className="group rounded-xl open:bg-green-950/20">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-green-300/80 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200">
                <Wallet className="h-5 w-5 text-green-500 transition-colors duration-200 group-open:text-green-300" />
                <span className="flex-1">Extrato</span>
                <ChevronDown className="h-5 w-5 text-green-500 transition-transform duration-200 group-open:rotate-180" />
              </summary>

              <div className="mb-2 ml-5 mr-2 mt-1 grid gap-1 pl-3">
                <Link
                  href="/admin/orders/abertas"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-green-400/90 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  Ordens Abertas
                </Link>
                <Link
                  href="/admin/orders/completas"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-green-400/90 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  Ordens Completas
                </Link>
                <Link
                  href="/admin/taxas"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-green-400/90 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  Comissões de agentes
                </Link>
                <Link
                  href="/admin/withdrawals/aprovar"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-green-400/90 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  Aprovar Saque
                </Link>
                <Link
                  href="/admin/withdrawals/aprovados"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-green-400/90 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  Saques Aprovados
                </Link>
                <Link
                  href="/admin/withdrawals/rejeitados"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-green-400/90 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  Saques Rejeitados
                </Link>
                <Link
                  href="/admin/giftcard-claims/abertas"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-green-400/90 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  Reinvidicacoes de Gifcards Abertas
                </Link>
                <Link
                  href="/admin/giftcard-claims/completas"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-green-400/90 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-green-950/50 hover:text-green-200"
                >
                  Reinvidicacoes de Gifcards Completas
                </Link>
              </div>
            </details>
          </nav>

          <div className="mt-auto rounded-2xl bg-black/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-green-600">Painel</p>
            <p className="mt-1 text-xs text-green-300/80">Estrutura unificada com navegacao lateral, visão rápida e contexto operacional.</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:ml-[320px]">
          <main className="px-4 py-5 lg:px-8">
            <div className="rounded-[28px] border border-green-900/40 bg-[#0f1318]/90 p-4 shadow-[0_0_40px_rgba(0,0,0,0.25)] sm:p-5">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
