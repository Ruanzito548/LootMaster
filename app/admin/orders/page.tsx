import OrdersPageClient from "./orders-page-client";

export const dynamic = "force-dynamic";

export default function AdminOrdersPage() {
  return <OrdersPageClient mode="all" />;
}
