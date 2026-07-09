import { requireAuthenticatedAdminPage } from "@/lib/server-session-auth";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAuthenticatedAdminPage();

  return <div className="admin-dashboard-theme">{children}</div>;
}
