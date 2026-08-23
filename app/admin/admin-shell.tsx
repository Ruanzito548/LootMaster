"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { AdminSidebar } from "./admin-sidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex w-full">
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="min-w-0 flex-1 lg:ml-[260px]">
        <div className="sticky top-20 z-20 flex justify-end px-4 pt-3 lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg border border-[#d4af5a]/35 bg-[#101722] p-2 text-[#e6c46a]" aria-label="Abrir menu">
            <Menu className="size-5" />
          </button>
        </div>
        <main className="px-3 py-4 sm:px-5 lg:px-6">
          <div className="min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
