"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";

type AdminSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

type NavGroup = {
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  items?: Array<{ href: string; label: string }>;
};

const groups: NavGroup[] = [
  { label: "Dashboard", icon: LayoutDashboard, items: [{ href: "/admin/dashboard", label: "Visão geral" }] },
  { label: "Itens", icon: Package, items: [{ href: "/admin/items", label: "Inventário e itens" }] },
  { label: "Cadastros", icon: Users, items: [{ href: "/admin/clientes/todos", label: "Usuários" }, { href: "/admin/clientes/agentes", label: "Parceiros" }] },
  { label: "Financeiro", icon: BarChart3, items: [{ href: "/admin/taxas", label: "Comissões e repasses" }, { href: "/admin/calculadora-financeira", label: "Dashboard financeiro" }] },
  { label: "Relatórios", icon: FileText, items: [{ href: "/admin/history", label: "Histórico operacional" }] },
  { label: "Configurações", icon: Settings, items: [{ href: "/admin/game-configuration", label: "Jogos" }, { href: "/admin/chests", label: "Rewards e Baús" }, { href: "/admin/discord-settings", label: "Pagamentos e Discord" }] },
  { label: "Extrato", icon: Wallet, items: [{ href: "/admin/orders/abertas", label: "Ordens Abertas" }, { href: "/admin/orders/completas", label: "Ordens Completas" }, { href: "/admin/withdrawals/aprovar", label: "Saques Pendentes" }, { href: "/admin/withdrawals/aprovados", label: "Saques Aprovados" }, { href: "/admin/withdrawals/rejeitados", label: "Saques Rejeitados" }, { href: "/admin/giftcard-claims/abertas", label: "Giftcards Abertos" }, { href: "/admin/giftcard-claims/completas", label: "Giftcards Completos" }] },
];

export function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Extrato: true });

  const sidebarClass = `fixed left-0 top-20 z-40 h-[calc(100vh-5rem)] border-r border-white/8 bg-[#080c12]/98 shadow-[12px_0_40px_rgba(0,0,0,0.2)] backdrop-blur-xl transition-all duration-300 ${collapsed ? "w-[76px]" : "w-[260px]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`;

  return (
    <>
      {mobileOpen ? <button type="button" aria-label="Fechar menu" onClick={onMobileClose} className="fixed inset-0 z-30 bg-black/70 lg:hidden" /> : null}
      <aside className={sidebarClass}>
        <div className="flex h-full flex-col overflow-y-auto p-3">
          <div className={`mb-4 rounded-xl border border-[#d4af5a]/20 bg-[#101722] p-3 ${collapsed ? "text-center" : ""}`}>
            <p className="text-[0.56rem] font-black uppercase tracking-[0.18em] text-[#d4af5a]">Admin</p>
            {!collapsed ? <><p className="mt-1 text-lg font-black text-[#f0ede4]">Loot Master</p><p className="mt-1 text-[0.65rem] text-[#8e98a3]">Centro de controle operacional</p></> : null}
          </div>

          <nav className="space-y-1">
            {groups.map((group) => {
              const Icon = group.icon;
              const active = group.items?.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
              const isOpen = openGroups[group.label] ?? active;
              return (
                <div key={group.label}>
                  <button type="button" title={collapsed ? group.label : undefined} onClick={() => !collapsed && setOpenGroups((current) => ({ ...current, [group.label]: !isOpen }))} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[0.72rem] font-bold uppercase tracking-[0.08em] transition ${active ? "bg-[#151b24] text-[#e6c46a]" : "text-[#a8b3c1] hover:bg-white/5 hover:text-[#f0ede4]"}`}>
                    <Icon className={`size-4 shrink-0 ${active ? "text-[#e6c46a]" : "text-[#748092]"}`} />
                    {!collapsed ? <><span className="flex-1">{group.label}</span>{group.badge ? <span className="rounded-full bg-[#7a3fa8]/30 px-1.5 py-0.5 text-[0.5rem] text-[#d6b2ff]">{group.badge}</span> : null}{group.items ? <ChevronDown className={`size-3 transition ${isOpen ? "rotate-180" : ""}`} /> : null}</> : null}
                  </button>
                  {!collapsed && group.items && isOpen ? <div className="ml-7 mt-0.5 space-y-0.5 border-l border-white/8 pl-2">{group.items.map((item) => <Link key={`${group.label}-${item.href}-${item.label}`} href={item.href} onClick={onMobileClose} className={`block rounded-md px-2 py-1.5 text-[0.65rem] transition ${pathname === item.href ? "bg-[#d4af5a]/12 font-bold text-[#e6c46a]" : "text-[#8290a3] hover:bg-white/5 hover:text-[#e6c46a]"}`}>{item.label}</Link>)}</div> : null}
                </div>
              );
            })}
          </nav>

          <button type="button" onClick={() => setCollapsed((value) => !value)} title={collapsed ? "Expandir menu" : "Recolher menu"} className="mt-3 flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#748092] hover:bg-white/5 hover:text-[#e6c46a]">{collapsed ? <Menu className="size-4" /> : <><X className="size-3" /> Recolher menu</>}</button>
        </div>
      </aside>
    </>
  );
}
