import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { writeActivityLog } from "@/lib/activity-history.server";
import { computeOrderFinancials } from "@/lib/order-financials";
import { clampPercent } from "@/lib/percent-utils";

type RequestBody = {
  orderId?: string;
  supplierName?: string;
  supplierPercentage?: number;
};

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;
  let decodedToken: Awaited<ReturnType<typeof requireAuthenticatedAdminRequest>>;

  try {
    decodedToken = await requireAuthenticatedAdminRequest(request);
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Unauthorized request." }, { status: 401 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const supplierPercentageRaw = typeof body.supplierPercentage === "number" ? body.supplierPercentage : Number.NaN;
  const supplierName = typeof body.supplierName === "string" ? body.supplierName.trim() : "";

  if (!orderId || Number.isNaN(supplierPercentageRaw)) {
    return Response.json({ error: "Missing required fields." }, { status: 422 });
  }

  const supplierPercentage = clampPercent(supplierPercentageRaw);

  try {
    const adminDb = getAdminDb();
    const ref = adminDb.collection("order-checkouts").doc(orderId);
    let financials = null as ReturnType<typeof computeOrderFinancials> | null;

    await adminDb.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);

      if (!snapshot.exists) {
        throw new Error("ORDER_NOT_FOUND");
      }

      const data = snapshot.data() as Record<string, unknown>;
      const amountTotalCents = typeof data.amountTotalCents === "number" ? data.amountTotalCents : 0;
      const baseProductCents =
        typeof data.baseProductCents === "number" && data.baseProductCents > 0
          ? data.baseProductCents
          : typeof data.baseAmountCents === "number" && data.baseAmountCents > 0
          ? data.baseAmountCents
          : amountTotalCents;
      const cardFeePercent = typeof data.cardFeePercent === "number" ? data.cardFeePercent : 0;
      const cashbackPercent = typeof data.cashbackPercent === "number" ? data.cashbackPercent : 0;
      const operationalReservePercent = typeof data.operationalReservePercent === "number" ? data.operationalReservePercent : 0;
      const previousSupplierPercentage =
        typeof data.supplierPercentage === "number" && Number.isFinite(data.supplierPercentage) ? data.supplierPercentage : null;
      const previousSupplierName = typeof data.supplierName === "string" ? data.supplierName : "";
      const targetUserUid = typeof data.customerUid === "string" && data.customerUid.trim() ? data.customerUid : decodedToken.uid;

      financials = computeOrderFinancials(
        amountTotalCents,
        supplierPercentage,
        cardFeePercent,
        cashbackPercent,
        operationalReservePercent,
      );

      // Supplier share applies to the product value only, never to the payment gateway surcharge.
      const supplierPayout = Math.max(0, Math.round(baseProductCents * (financials.supplierPercentage / 100)));
      const grossProfit = Math.max(0, amountTotalCents - supplierPayout);
      financials = {
        ...financials,
        supplierPayout,
        grossProfit,
        netProfit: grossProfit - financials.cardFee - financials.cashback - financials.operationalReserve,
      };

      tx.set(
        ref,
        {
          supplierName,
          supplierPercentage: financials.supplierPercentage,
          grossRevenue: financials.grossRevenue,
          supplierPayout: financials.supplierPayout,
          grossProfit: financials.grossProfit,
          cardFee: financials.cardFee,
          cashback: financials.cashback,
          operationalReserve: financials.operationalReserve,
          netProfit: financials.netProfit,
          commissionPercent: Math.max(0, 100 - financials.supplierPercentage),
          sellerAmountCents: financials.supplierPayout,
          platformProfitCents: financials.netProfit,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      // Re-sync the partner commission so it reflects the corrected supplier percentage instead of staying frozen at checkout time.
      const feeTransferRef = adminDb.collection("fee-transfers").doc(orderId);
      const feeTransferSnapshot = await tx.get(feeTransferRef);

      if (feeTransferSnapshot.exists) {
        const feeTransferData = feeTransferSnapshot.data() as Record<string, unknown>;
        const alreadyCredited =
          feeTransferData.agentPayoutCredited === true || feeTransferData.status === "processed";

        if (!alreadyCredited) {
          const agentUid = typeof feeTransferData.agentUid === "string" ? feeTransferData.agentUid.trim() : "";
          const agentFeeSharePercent =
            typeof feeTransferData.agentFeeSharePercent === "number" && Number.isFinite(feeTransferData.agentFeeSharePercent)
              ? feeTransferData.agentFeeSharePercent
              : 0;
          const partnerDiscountPartnerCents =
            typeof feeTransferData.partnerDiscountPartnerCents === "number" && Number.isFinite(feeTransferData.partnerDiscountPartnerCents)
              ? feeTransferData.partnerDiscountPartnerCents
              : 0;
          const partnerDiscountLootMasterCents =
            typeof feeTransferData.partnerDiscountLootMasterCents === "number" && Number.isFinite(feeTransferData.partnerDiscountLootMasterCents)
              ? feeTransferData.partnerDiscountLootMasterCents
              : 0;

          const totalDiscountCents = partnerDiscountPartnerCents + partnerDiscountLootMasterCents;
          const originalGoldCents = baseProductCents + totalDiscountCents;
          const originalSupplierPayoutCents = Math.max(
            0,
            Math.round(originalGoldCents * (financials.supplierPercentage / 100)),
          );
          const commissionBaseCents = Math.max(0, originalGoldCents - originalSupplierPayoutCents);
          const agentPayoutCents = agentUid
            ? Math.max(0, Math.round(commissionBaseCents * (agentFeeSharePercent / 100)))
            : 0;
          const lootmasterFeeCents = Math.max(0, commissionBaseCents - agentPayoutCents - totalDiscountCents);
          const agentPayoutLootCoins = Math.round((agentPayoutCents / 100) * 100) / 100;

          tx.set(
            feeTransferRef,
            {
              commissionBaseCents,
              commissionPercent: Math.max(0, 100 - financials.supplierPercentage),
              platformFeeCents: agentPayoutCents + lootmasterFeeCents,
              agentPayoutCents,
              lootmasterFeeCents,
              agentPayoutLootCoins,
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );

          tx.set(
            ref,
            {
              platformFeeCents: agentPayoutCents + lootmasterFeeCents,
              agentPayoutCents,
              lootmasterFeeCents,
              platformProfitCents: lootmasterFeeCents,
            },
            { merge: true },
          );
        }
      }

      writeActivityLog(tx, adminDb, {
        userUid: targetUserUid,
        actorUid: decodedToken.uid,
        actorRole: "admin",
        actionType: "admin_order_supplier_fee_updated",
        category: "admin",
        description: `Admin updated supplier percentage for order ${orderId}.`,
        origin: "admin.orders.update-fee",
        status: "admin_action",
        tags: ["admin", "orders", "finance", "supplier"],
        metadata: {
          orderId,
          previousSupplierPercentage,
          nextSupplierPercentage: financials.supplierPercentage,
          previousSupplierName: previousSupplierName || null,
          nextSupplierName: supplierName || null,
          supplierPayout: financials.supplierPayout,
          netProfit: financials.netProfit,
        },
        mirrorToAdminAudit: true,
      });
    });

    if (!financials) {
      return Response.json({ error: "Could not compute order financials." }, { status: 500 });
    }

    return Response.json({
      ok: true,
      supplierName,
      supplierPercentage: financials.supplierPercentage,
      supplierPayout: financials.supplierPayout,
      grossProfit: financials.grossProfit,
      netProfit: financials.netProfit,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    const message = error instanceof Error ? error.message : "Could not update order supplier settings.";
    return Response.json({ error: message }, { status: 500 });
  }
}
