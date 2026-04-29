import Link from "next/link";

import { InventoryItemsAdmin } from "../../components/inventory-items-admin";

export default function AdminItemsPage() {
  return (
    <>
      <InventoryItemsAdmin />
      <div className="mx-auto w-full max-w-5xl px-6 pb-12 lg:px-8">
        <Link
          href="/admin"
          className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors"
        >
          Back to admin
        </Link>
      </div>
    </>
  );
}