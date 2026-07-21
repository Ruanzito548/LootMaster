import OrdersPageClient from "../orders-page-client";

export const dynamic = "force-dynamic";

export default function AdminOrdersOpenPage() {
  return <OrdersPageClient mode="open" />;
}
