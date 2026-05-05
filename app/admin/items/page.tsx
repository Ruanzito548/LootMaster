import Link from "next/link";

import { InventoryItemsAdmin } from "../../components/inventory-items-admin";

export default function AdminItemsPage() {
  return (
    <>
      <InventoryItemsAdmin />
      <div className="mx-auto w-full max-w-5xl px-6 pb-12 lg:px-8">
        <Link
          href="/admin"
          className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950"
        >
          Back to admin
        </Link>
      </div>
    </>
  );
}