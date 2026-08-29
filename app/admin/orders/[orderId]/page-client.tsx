"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";

import { auth, db, firebaseEnabled } from "@/lib/firebase";
import {
  type OrderApplication,
  type OrderDispatch,
  subscribeToOrderApplications,
  subscribeToOrderDispatch,
} from "@/lib/order-applications";

type OrderSummary = {
  orderId: string;
  gameTitle: string;
  categoryTitle: string;
  nickname: string;
  goldAmount: number;
  server: string;
  faction: string;
  totalLabel: string;
  payoutLabel: string;
  totalCents: number;
  goldCents: number;
  supplierPayoutCents: number;
  supplierPercentage: number;
  gatewayLabel: string;
  gatewayCents: number;
  gatewayPercent: number;
  cashbackCents: number;
  cashbackPercent: number;
  operationalReserveCents: number;
  operationalReservePercent: number;
  partnerCommissionCents: number;
  partnerCommissionPercent: number;
  partnerDiscountCents: number;
  netProfitCents: number;
  profitMarginPercent: number;
  orderCreatedAtIso: string | null;
  dailyOrdersCount: number;
  weeklyOrdersCount: number;
  monthlyOrdersCount: number;
  annualOrdersCount: number;
  agentName: string;
  agentEmail: string;
  assignedAgentId: string;
};

function formatMoneyUsdFromUsdCents(amountInUsdCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInUsdCents / 100);
}

function formatDeductionUsdFromUsdCents(amountInUsdCents: number) {
  return `-${formatMoneyUsdFromUsdCents(Math.abs(amountInUsdCents))}`;
}

type Props = {
  summary: OrderSummary;
  initialApplications: OrderApplication[];
  discordAutoSendEnabled: boolean;
};

export function AdminOrderApplicantsClient({ summary, initialApplications, discordAutoSendEnabled }: Props) {
  const [applications, setApplications] = useState<OrderApplication[]>(initialApplications);
  const [dispatch, setDispatch] = useState<OrderDispatch | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser) && firebaseEnabled);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  const formatMoney = (amountInUsdCents: number) => formatMoneyUsdFromUsdCents(amountInUsdCents);
  const formatDeduction = (amountInUsdCents: number) => formatDeductionUsdFromUsdCents(amountInUsdCents);

  useEffect(() => {
    if (!auth) {
      return () => undefined;
    }

    return onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setApplications(initialApplications);
      return () => undefined;
    }

    return subscribeToOrderApplications(summary.orderId, (next) => {
      startTransition(() => {
        // Keep server-preloaded applicants visible if realtime query returns empty.
        if (next.length === 0 && initialApplications.length > 0) {
          setApplications(initialApplications);
          return;
        }

        setApplications(next);
      });
    });
  }, [initialApplications, isAuthenticated, summary.orderId]);

  useEffect(() => {
    if (!isAuthenticated) {
      setDispatch(null);
      return () => undefined;
    }

    return subscribeToOrderDispatch(summary.orderId, (next) => {
      startTransition(() => setDispatch(next));
    });
  }, [isAuthenticated, summary.orderId]);

  const selectSupplier = async (application: OrderApplication) => {
    if (submitLockRef.current) {
      return;
    }

    if (!db || !auth?.currentUser) {
      setErrorMessage("Sign in with Google before selecting a supplier.");
      return;
    }

    submitLockRef.current = true;
    setSubmittingId(application.applicationId);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const isReplacingSupplier =
        Boolean(dispatch?.threadId) &&
        dispatch?.status === "assigned" &&
        dispatch.selectedApplicationId !== application.applicationId &&
        !dispatch.channelClosed;

      const response = await fetch("/api/admin/orders/select-supplier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderId: summary.orderId,
          supplierName: application.supplierName,
          supplierDiscordHandle: application.supplierDiscordHandle,
          supplierDiscordUserId: application.supplierDiscordUserId,
          gameTitle: summary.gameTitle,
          categoryTitle: summary.categoryTitle,
          goldAmount: summary.goldAmount,
          server: summary.server,
          faction: summary.faction,
          nickname: summary.nickname,
          totalLabel: summary.totalLabel,
          payoutLabel: summary.payoutLabel,
          previousThreadId: dispatch?.threadId ?? "",
          closePreviousThread: isReplacingSupplier,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        threadId?: string;
        threadUrl?: string;
        walletAssignmentWarning?: string | null;
        previousThreadCloseWarning?: string | null;
      };

      if (!response.ok || !data.threadId || !data.threadUrl) {
        setErrorMessage(data.error ?? "Could not create the supplier Discord thread.");
        return;
      }

      const warnings = [data.walletAssignmentWarning, data.previousThreadCloseWarning].filter(
        (value): value is string => Boolean(value),
      );

      if (warnings.length > 0) {
        setInfoMessage(warnings.join(" "));
      }

      await setDoc(doc(db, "order-dispatches", summary.orderId), {
        orderId: summary.orderId,
        status: "assigned",
        selectedApplicationId: application.applicationId,
        selectedSupplierName: application.supplierName,
        selectedSupplierEmail: application.supplierEmail,
        selectedSupplierDiscordHandle: application.supplierDiscordHandle,
        selectedSupplierDiscordUserId: application.supplierDiscordUserId,
        threadId: data.threadId,
        threadUrl: data.threadUrl,
        previousThreadId: isReplacingSupplier ? dispatch?.threadId ?? null : null,
        selectedByUid: auth.currentUser.uid,
        selectedAt: serverTimestamp(),
        reassignedAt: isReplacingSupplier ? serverTimestamp() : null,
        channelClosed: false,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not create the supplier Discord thread.");
    } finally {
      submitLockRef.current = false;
      setSubmittingId(null);
    }
  };

  const resendOrderToDiscord = async () => {
    if (!auth?.currentUser || isResending || isClosing) {
      return;
    }

    setIsResending(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/orders/resend-discord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderId: summary.orderId,
        }),
      });

      const data = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !data.ok) {
        setErrorMessage(data.error ?? "Não foi possível reenviar a ordem ao Discord.");
        return;
      }

      setInfoMessage("Ordem reenviada ao Discord com sucesso.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível reenviar a ordem ao Discord.");
    } finally {
      setIsResending(false);
    }
  };

  const completeDispatch = async () => {
    if (!dispatch?.threadId || !db || !auth?.currentUser || isCompleting || isClosing) {
      return;
    }

    setIsCompleting(true);
    setErrorMessage(null);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const idempotencyKey = `complete:${summary.orderId}:${dispatch.threadId}`;
      const response = await fetch("/api/admin/orders/complete-supplier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderId: summary.orderId,
          threadId: dispatch.threadId,
          paidByUid: auth.currentUser.uid,
          idempotencyKey,
        }),
      });

      const data = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !data.ok) {
        setErrorMessage(data.error ?? "Não foi possível concluir o repasse do fornecedor.");
        return;
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível concluir o repasse do fornecedor.");
    } finally {
      setIsCompleting(false);
    }
  };

  const closeOrder = async () => {
    if (!dispatch?.threadId || !auth?.currentUser || isClosing || isCompleting) {
      return;
    }

    setIsClosing(true);
    setErrorMessage(null);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const idempotencyKey = `complete:${summary.orderId}:${dispatch.threadId}`;
      const response = await fetch("/api/admin/orders/close-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderId: summary.orderId,
          threadId: dispatch.threadId,
          completedByUid: auth.currentUser.uid,
          idempotencyKey,
        }),
      });

      const data = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !data.ok) {
        setErrorMessage(data.error ?? "Não foi possível fechar o canal da ordem.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível fechar o canal da ordem.");
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <section className="mt-6 space-y-6">
      <article className="rounded-2xl border border-green-900 bg-black p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Resumo da ordem</p>
          {!discordAutoSendEnabled ? (
            <button
              type="button"
              onClick={() => void resendOrderToDiscord()}
              disabled={!isAuthenticated || dispatch?.status === "completed" || isResending || isCompleting || isClosing}
              className="inline-flex rounded-md border border-cyan-700 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-950/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isResending ? "Enviando..." : "Enviar ao Discord"}
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700">ID da ordem</p>
            <p className="mt-1 break-all text-sm font-semibold text-green-300">{summary.orderId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700">Ordem</p>
            <p className="mt-1 text-sm font-semibold text-green-300">{summary.gameTitle} / {summary.categoryTitle}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700">Personagem</p>
            <p className="mt-1 text-sm font-semibold text-green-300">{summary.nickname}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700">Quantidade de gold</p>
            <p className="mt-1 text-sm font-semibold text-green-300">{summary.goldAmount.toLocaleString("en-US")} gold</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700">Server</p>
            <p className="mt-1 text-sm font-semibold text-green-300">{summary.server}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700">Faction</p>
            <p className="mt-1 text-sm font-semibold text-green-300">{summary.faction}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700">Total</p>
            <p className="mt-1 text-sm font-semibold text-green-300">{formatMoney(summary.totalCents)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700">Repasse do fornecedor</p>
            <p className="mt-1 text-sm font-semibold text-green-300">
              {formatMoney(summary.supplierPayoutCents)} ({summary.supplierPercentage.toFixed(2)}%)
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700">Parceiro vinculado</p>
            <p className="mt-1 text-sm font-semibold text-green-300">{summary.agentName}</p>
            {summary.agentEmail !== "--" ? (
              <p className="mt-1 text-xs text-green-500">{summary.agentEmail}</p>
            ) : null}
          </div>
        </div>

        <article className="mt-5 rounded-xl border border-green-900 bg-green-950/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Resumo Financeiro da Order</p>

          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-green-200">Valor total pago</span>
              <span className="font-semibold text-green-200">{formatMoney(summary.totalCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-green-300">Valor do gold</span>
              <span className="font-semibold text-green-200">{formatMoney(summary.goldCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-green-300">Repasse ao fornecedor ({summary.supplierPercentage.toFixed(2)}%)</span>
              <span className="font-semibold text-rose-300">{formatDeduction(summary.supplierPayoutCents)}</span>
            </div>
            <div className="border-t border-dashed border-green-900 pt-2" />
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-green-100">Lucro Bruto</span>
              <span className="font-bold text-green-100">{formatMoney(summary.goldCents - summary.supplierPayoutCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-green-300">Comissão do agente ({summary.partnerCommissionPercent.toFixed(2)}% do lucro bruto)</span>
              <span className="font-semibold text-rose-300">{formatDeduction(summary.partnerCommissionCents)}</span>
            </div>
            {summary.partnerDiscountCents > 0 ? (
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-amber-400">Já descontado: desconto de primeira compra custeado pelo parceiro</span>
                <span className="font-semibold text-amber-400">-{formatMoney(summary.partnerDiscountCents)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="text-green-300">Cashback / Loot Coins ({summary.cashbackPercent.toFixed(2)}%)</span>
              <span className="font-semibold text-rose-300">{formatDeduction(summary.cashbackCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-green-300">Reserva Operacional ({summary.operationalReservePercent.toFixed(2)}%)</span>
              <span className="font-semibold text-rose-300">{formatDeduction(summary.operationalReserveCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-green-100">Lucro Líquido</span>
              <span className="font-bold text-green-100">{formatMoney(summary.netProfitCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-dashed border-green-900 pt-2">
              <span className="font-bold text-green-100">Margem de lucro da venda</span>
              <span className={`font-bold ${summary.profitMarginPercent >= 0 ? "text-green-100" : "text-rose-300"}`}>
                {summary.profitMarginPercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </article>
      </article>

      {dispatch ? (
        <article className="rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Fornecedor selecionado</p>
              <h2 className="mt-2 text-xl font-semibold text-emerald-300">{dispatch.selectedSupplierName}</h2>
              <p className="mt-1 text-sm text-emerald-200">{dispatch.selectedSupplierEmail}</p>
              <p className="mt-1 text-sm text-emerald-200">
                {dispatch.selectedSupplierDiscordHandle || "Sem usuário do Discord"} / {dispatch.selectedSupplierDiscordUserId}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
                Status: {dispatch.status === "completed" ? "Concluído" : dispatch.status === "paid" ? "Pago" : "Atribuído"}
              </p>
              {dispatch.lootCoinsPayoutAmount > 0 ? (
                <p className="mt-1 text-xs font-semibold text-emerald-300">
                  Loot Coins enviados: {dispatch.lootCoinsPayoutAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!dispatch.channelClosed ? (
                <Link
                  href={dispatch.threadUrl}
                  target="_blank"
                  className="inline-flex rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-950/40"
                >
                  Abrir canal do Discord
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => void completeDispatch()}
                disabled={!isAuthenticated || dispatch.status !== "assigned" || isCompleting || isClosing}
                className="inline-flex rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isCompleting
                  ? "Marcando como pago..."
                  : "Marcar como pago"}
              </button>
              <button
                type="button"
                onClick={() => void closeOrder()}
                disabled={!isAuthenticated || (dispatch.status !== "paid" && dispatch.status !== "completed") || dispatch.channelClosed || isClosing || isCompleting}
                className="inline-flex rounded-md border border-rose-700 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {dispatch.channelClosed
                  ? "Concluído"
                  : isClosing
                  ? "Concluindo..."
                  : "Marcar como concluído"}
              </button>
            </div>
          </div>
        </article>
      ) : null}

      {!isAuthenticated ? (
        <article className="rounded-2xl border border-amber-900 bg-amber-950/20 p-6 text-amber-200">
          <p className="text-sm font-semibold">Entre com uma conta para revisar as aplicações e selecionar um fornecedor.</p>
          <div className="mt-4">
            <Link href="/login" className="inline-flex rounded-md border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-950/40">
              Abrir login
            </Link>
          </div>
        </article>
      ) : null}

      {errorMessage ? (
        <p className="rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">{errorMessage}</p>
      ) : null}

      {infoMessage ? (
        <p className="rounded-xl border border-cyan-900 bg-cyan-950/20 px-5 py-4 text-sm font-medium text-cyan-300">{infoMessage}</p>
      ) : null}

      <article className="overflow-x-auto rounded-xl border border-green-900 bg-black">
        {applications.length === 0 ? (
          <p className="px-5 py-4 text-sm text-green-600">Nenhum fornecedor se candidatou a esta ordem ainda.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-green-900 text-xs font-semibold uppercase tracking-wide text-green-600">
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Discord</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application, index) => {
                const isSelected = dispatch?.selectedApplicationId === application.applicationId;
                const isPartnerApplication =
                  Boolean(summary.assignedAgentId) && application.uid === summary.assignedAgentId;

                return (
                  <tr
                    key={application.applicationId}
                    className={`border-b border-green-950 ${
                      isPartnerApplication ? "bg-emerald-900/20" : index % 2 === 0 ? "" : "bg-green-950/20"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">
                      <span className={isPartnerApplication ? "text-emerald-400" : "text-green-300"}>
                        {application.supplierName}
                      </span>
                      {isPartnerApplication ? (
                        <span className="ml-2 inline-flex items-center rounded-full border border-emerald-500 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                          Cliente do parceiro
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-green-500">{application.supplierEmail}</td>
                    <td className="px-4 py-3 text-xs text-green-500">
                      {application.supplierDiscordHandle || "Sem identificador"}
                      <span className="ml-1 text-green-700">/ {application.supplierDiscordUserId || "ID ausente"}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold uppercase text-green-400">
                      {isSelected ? "Selecionado" : application.status}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void selectSupplier(application)}
                        disabled={
                          !isAuthenticated ||
                          dispatch?.status === "paid" ||
                          dispatch?.status === "completed" ||
                          submittingId === application.applicationId ||
                          isSelected
                        }
                        className="inline-flex rounded-md border border-green-800 px-3 py-2 text-xs font-semibold text-green-300 transition hover:bg-green-950 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isSelected
                          ? "Fornecedor selecionado"
                          : submittingId === application.applicationId
                          ? "Criando canal..."
                          : dispatch?.selectedApplicationId
                          ? "Trocar para este fornecedor"
                          : "Selecionar fornecedor"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>
    </section>
  );
}