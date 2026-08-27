"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function PixPaymentContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id") ?? "";
  const [payment, setPayment] = useState<{ status: string; externalReference: string; deliveryMethod: string; qrCode: string; qrCodeBase64: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/checkout/pix?payment_id=${encodeURIComponent(paymentId)}`, { cache: "no-store" });
        const data = (await response.json()) as NonNullable<typeof payment> & { error?: string };
        if (!response.ok || !data.qrCode || !data.qrCodeBase64) throw new Error(data.error ?? "Could not load PIX payment.");
        if (!cancelled) setPayment(data);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load PIX payment.");
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [paymentId]);

  useEffect(() => {
    if (!paymentId || !payment || payment.status === "approved") return;

    const checkPayment = async () => {
      try {
        const response = await fetch(`/api/checkout/pix?payment_id=${encodeURIComponent(paymentId)}`, { cache: "no-store" });
        const data = (await response.json()) as { status?: string; externalReference?: string; error?: string };
        if (!response.ok) return;

        if (data.status === "approved" && data.externalReference) {
          window.location.replace(`/checkout/success?session_id=${encodeURIComponent(data.externalReference)}&delivery_method=${encodeURIComponent(payment.deliveryMethod)}`);
          return;
        }

        setPayment((current) => current ? { ...current, status: data.status ?? current.status } : current);
      } catch {
        // The webhook remains authoritative; a temporary polling error is harmless.
      }
    };

    const interval = window.setInterval(() => void checkPayment(), 5000);
    return () => window.clearInterval(interval);
  }, [payment, paymentId]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <section className="loot-panel w-full rounded-[2rem] p-8 sm:p-10">
        <p className="loot-kicker text-xs font-bold uppercase tracking-[0.2em]">Mercado Pago</p>
        <h1 className="loot-title mt-3 text-3xl font-black">Pay with PIX</h1>
        <p className="loot-muted mt-3 text-sm">Scan the QR code or copy the PIX code. Your order is confirmed only after Mercado Pago approves the payment.</p>
        {error ? <p className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
        {payment ? (
          <>
            <Image src={`data:image/png;base64,${payment.qrCodeBase64}`} alt="PIX QR Code" width={224} height={224} unoptimized className="mx-auto mt-7 h-56 w-56 rounded-xl bg-white p-3" />
            <button type="button" onClick={() => void navigator.clipboard.writeText(payment.qrCode)} className="loot-gold-button mt-6 rounded-full px-5 py-3 text-sm font-semibold">Copy PIX code</button>
            <p className="loot-muted mt-4 break-all rounded-xl border border-white/10 bg-black/20 p-3 text-left text-xs">{payment.qrCode}</p>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-amber-200">Awaiting payment confirmation</p>
          </>
        ) : !error ? <p className="loot-muted mt-8 text-sm">Loading PIX payment...</p> : null}
        <Link href="/" className="loot-secondary-button mt-7 inline-flex rounded-full px-5 py-3 text-sm font-semibold">Back to home</Link>
      </section>
    </main>
  );
}

export default function PixPaymentPage() {
  return <div className="loot-shell"><Suspense><PixPaymentContent /></Suspense></div>;
}
