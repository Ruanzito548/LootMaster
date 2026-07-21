import OrdersPageClient from "../orders-page-client";

export const dynamic = "force-dynamic";

export default function AdminOrdersCompletedPage() {
  return <OrdersPageClient mode="completed" />;
}
