import { requireAuthenticatedAdminPage } from "@/lib/server-session-auth";
import { AdminShell } from "./admin-shell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAuthenticatedAdminPage();

  return <div className="admin-dashboard-theme min-h-screen bg-[#070b10] text-green-200"><AdminShell>{children}</AdminShell></div>;
}
