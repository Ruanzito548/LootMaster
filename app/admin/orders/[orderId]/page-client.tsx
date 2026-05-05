"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

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
};

type Props = {
  summary: OrderSummary;
};

export function AdminOrderApplicantsClient({ summary }: Props) {
  const [applications, setApplications] = useState<OrderApplication[]>([]);
  const [dispatch, setDispatch] = useState<OrderDispatch | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser) && firebaseEnabled);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setApplications([]);
      return () => undefined;
    }

    return subscribeToOrderApplications(summary.orderId, (next) => {
      startTransition(() => setApplications(next));
    });
  }, [isAuthenticated, summary.orderId]);

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
    if (!db || !auth?.currentUser) {
      setErrorMessage("Sign in with Google before selecting a supplier.");
      return;
    }

    setSubmittingId(application.applicationId);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/orders/select-supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: summary.orderId,
          supplierName: application.supplierName,
          supplierDiscordHandle: application.supplierDiscordHandle,
          supplierDiscordUserId: application.supplierDiscordUserId,
          gameTitle: application.gameTitle,
          categoryTitle: application.categoryTitle,
          goldAmount: application.goldAmount,
          server: application.server,
          faction: application.faction,
          nickname: application.nickname,
          totalLabel: summary.totalLabel,
        }),
      });

      const data = (await response.json()) as { error?: string; threadId?: string; threadUrl?: string };

      if (!response.ok || !data.threadId || !data.threadUrl) {
        setErrorMessage(data.error ?? "Could not create the supplier Discord thread.");
        return;
      }

      await setDoc(doc(db, "order-dispatches", summary.orderId), {
        orderId: summary.orderId,
        selectedApplicationId: application.applicationId,
        selectedSupplierName: application.supplierName,
        selectedSupplierEmail: application.supplierEmail,
        selectedSupplierDiscordHandle: application.supplierDiscordHandle,
        selectedSupplierDiscordUserId: application.supplierDiscordUserId,
        threadId: data.threadId,
        threadUrl: data.threadUrl,
        selectedByUid: auth.currentUser.uid,
        selectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not create the supplier Discord thread.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <section className="mt-6 space-y-6">
      <article className="rounded-2xl border border-green-900 bg-black p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Order Summary</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700">Order ID</p>
            <p className="mt-1 break-all text-sm font-semibold text-green-300">{summary.orderId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700">Order</p>
            <p className="mt-1 text-sm font-semibold text-green-300">{summary.gameTitle} / {summary.categoryTitle}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700">Character</p>
            <p className="mt-1 text-sm font-semibold text-green-300">{summary.nickname}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700">Gold Amount</p>
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
            <p className="mt-1 text-sm font-semibold text-green-300">{summary.totalLabel}</p>
          </div>
        </div>
      </article>

      {dispatch ? (
        <article className="rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Selected Supplier</p>
              <h2 className="mt-2 text-xl font-semibold text-emerald-300">{dispatch.selectedSupplierName}</h2>
              <p className="mt-1 text-sm text-emerald-200">{dispatch.selectedSupplierEmail}</p>
              <p className="mt-1 text-sm text-emerald-200">
                {dispatch.selectedSupplierDiscordHandle || "No Discord handle"} / {dispatch.selectedSupplierDiscordUserId}
              </p>
            </div>
            <Link
              href={dispatch.threadUrl}
              target="_blank"
              className="inline-flex rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-950/40"
            >
              Open Discord thread
            </Link>
          </div>
        </article>
      ) : null}

      {!isAuthenticated ? (
        <article className="rounded-2xl border border-amber-900 bg-amber-950/20 p-6 text-amber-200">
          <p className="text-sm font-semibold">Sign in with Google before reviewing applicants and selecting a supplier.</p>
          <div className="mt-4">
            <Link href="/login" className="inline-flex rounded-md border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-950/40">
              Open login
            </Link>
          </div>
        </article>
      ) : null}

      {errorMessage ? (
        <p className="rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">{errorMessage}</p>
      ) : null}

      <article className="overflow-x-auto rounded-xl border border-green-900 bg-black">
        {applications.length === 0 ? (
          <p className="px-5 py-4 text-sm text-green-600">No suppliers have applied for this order yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-green-900 text-xs font-semibold uppercase tracking-wide text-green-600">
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Discord</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application, index) => {
                const isSelected = dispatch?.selectedApplicationId === application.applicationId;

                return (
                  <tr
                    key={application.applicationId}
                    className={`border-b border-green-950 ${index % 2 === 0 ? "" : "bg-green-950/20"}`}
                  >
                    <td className="px-4 py-3 font-medium text-green-300">{application.supplierName}</td>
                    <td className="px-4 py-3 text-xs text-green-500">{application.supplierEmail}</td>
                    <td className="px-4 py-3 text-xs text-green-500">
                      {application.supplierDiscordHandle || "No handle"}
                      <span className="ml-1 text-green-700">/ {application.supplierDiscordUserId || "Missing User ID"}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold uppercase text-green-400">
                      {isSelected ? "Selected" : application.status}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void selectSupplier(application)}
                        disabled={
                          !isAuthenticated ||
                          submittingId === application.applicationId ||
                          isSelected
                        }
                        className="inline-flex rounded-md border border-green-800 px-3 py-2 text-xs font-semibold text-green-300 transition hover:bg-green-950 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isSelected
                          ? "Supplier selected"
                          : submittingId === application.applicationId
                          ? "Creating thread..."
                          : "Select supplier"}
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