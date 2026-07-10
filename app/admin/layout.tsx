import Link from "next/link";
import { Home, LayoutDashboard, ListChecks, Package, Settings, Wallet } from "lucide-react";
import { requireAuthenticatedAdminPage } from "@/lib/server-session-auth";

const adminNavItems = [
  { href: "/admin", label: "Central", icon: Home },
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Pedidos", icon: ListChecks },
  { href: "/admin/withdrawals", label: "Saques", icon: Wallet },
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
      <div className="mx-auto flex w-full max-w-[1900px]">
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 border-r border-green-900/40 bg-black/80 p-4 lg:flex lg:flex-col">
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
          </nav>

          <div className="mt-auto rounded-2xl border border-green-900/50 bg-black/50 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-green-600">Painel</p>
            <p className="mt-1 text-xs text-green-300/80">Estrutura unificada com navegacao lateral e area central ampla.</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-green-900/35 bg-black/70 px-4 py-3 backdrop-blur lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-green-300">
                <LayoutDashboard className="h-4 w-4" />
                Central
              </div>
              <div className="w-full max-w-md">
                <input
                  type="text"
                  placeholder="Pesquisar no admin"
                  className="w-full rounded-xl border border-green-900/50 bg-green-950/20 px-3 py-2 text-sm text-green-100 outline-none transition placeholder:text-green-600 focus:border-green-600"
                />
              </div>
            </div>
          </header>

          <main className="px-4 py-5 lg:px-8">
            <div className="rounded-2xl border border-green-900/40 bg-[#111317] p-4 sm:p-5">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
