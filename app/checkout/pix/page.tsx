"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Check, Clipboard, Clock3, FileText, Gamepad2, Headphones, Landmark, LockKeyhole, MapPin, Package, QrCode } from "lucide-react";

type PixOrder = {
  orderId: string;
  gameTitle: string;
  categoryTitle: string;
  goldAmount: number | null;
  server: string;
  faction: string;
  customerEmail: string;
  amountTotalCents: number | null;
  currency: string;
};

type PixPayment = {
  status: string;
  externalReference: string;
  deliveryMethod: string;
  qrCode: string;
  qrCodeBase64: string;
  order: PixOrder;
};

function formatMoney(cents: number | null, currency: string) {
  if (typeof cents !== "number") return "-";
  const code = currency.toUpperCase() === "BRL" ? "BRL" : currency.toUpperCase() === "EUR" ? "EUR" : "USD";
  return new Intl.NumberFormat(code === "BRL" ? "pt-BR" : "en-US", { style: "currency", currency: code }).format(cents / 100);
}

function getPaymentStage(status: string) {
  if (status === "approved") return 3;
  if (status === "in_process" || status === "authorized") return 2;
  return 1;
}

function PixPaymentContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id") ?? "";
  const [payment, setPayment] = useState<PixPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/checkout/pix?payment_id=${encodeURIComponent(paymentId)}`, { cache: "no-store" });
        const data = (await response.json()) as PixPayment & { error?: string };
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
        const data = (await response.json()) as Partial<PixPayment> & { error?: string };
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

  const stage = getPaymentStage(payment?.status ?? "pending");
  const deliveryLabel = payment?.deliveryMethod === "Mailbox" ? "Mail" : payment?.deliveryMethod || "-";
  const deliveryTime = payment?.deliveryMethod === "Mailbox" ? "Up to 2 hours" : payment?.deliveryMethod === "Face to face" ? "Up to 30 minutes" : "-";

  const copyPixCode = async () => {
    if (!payment) return;
    await navigator.clipboard.writeText(payment.qrCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="loot-shell relative isolate min-h-[calc(100vh-5rem)] overflow-hidden bg-[#030711]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Image src="/inventario/bgtotal.png" alt="" fill priority sizes="100vw" className="object-cover object-center opacity-55 blur-[1px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,17,0.54),rgba(3,7,17,0.86)),radial-gradient(circle_at_50%_10%,rgba(63,92,170,0.2),transparent_48%)]" />
        <div className="absolute inset-0 bg-black/20 [box-shadow:inset_0_0_180px_rgba(0,0,0,0.78)]" />
      </div>

      <main className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="overflow-hidden rounded-[1.25rem] border border-[#d4af5a]/45 bg-[#050b18]/80 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.56)] backdrop-blur-xl sm:p-8 lg:p-9">
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:gap-10">
            <div className="flex min-w-0 flex-col">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.26em] text-[#e6c46a]">Mercado Pago</p>
              <h1 className="loot-title mt-3 text-3xl font-black leading-tight text-[#f4f0e7] sm:text-4xl">Pague com PIX</h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-[#a9b9d0]">Escaneie o QR code com o app do seu banco ou copie o código PIX.</p>
              <p className="mt-2 text-xs font-semibold text-[#d4af7a]">Seu pedido será confirmado após a aprovação do pagamento.</p>

              {error ? <p className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
              {payment ? (
                <>
                  <div className="mt-7 rounded-xl border border-white/10 bg-[#081224]/75 p-4 shadow-[0_14px_35px_rgba(0,0,0,0.26)]">
                    <p className="mb-3 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#e6c46a]">Resumo do pedido</p>
                    <div className="space-y-3 text-xs">
                      <div className="flex items-start justify-between gap-4"><span className="flex items-center gap-2 text-[#8294af]"><FileText className="size-3.5" /> Nº do pedido</span><span className="max-w-[12rem] break-all text-right font-semibold text-[#e8eef8]">#{payment.order.orderId || "-"}</span></div>
                      <div className="flex items-start justify-between gap-4"><span className="flex items-center gap-2 text-[#8294af]"><Gamepad2 className="size-3.5" /> Descrição</span><span className="text-right font-semibold text-[#e8eef8]">{payment.order.categoryTitle || "Gold"} - {payment.order.goldAmount?.toLocaleString("pt-BR") ?? "-"}</span></div>
                      <div className="flex items-start justify-between gap-4"><span className="flex items-center gap-2 text-[#8294af]"><MapPin className="size-3.5" /> Servidor</span><span className="text-right font-semibold text-[#e8eef8]">{[payment.order.server, payment.order.faction].filter(Boolean).join(" / ") || "-"}</span></div>
                      <div className="flex items-start justify-between gap-4"><span className="flex items-center gap-2 text-[#8294af]"><Package className="size-3.5" /> Entrega</span><span className="text-right font-semibold text-[#e8eef8]">{deliveryLabel}</span></div>
                      <div className="flex items-start justify-between gap-4 border-t border-white/8 pt-3"><span className="flex items-center gap-2 text-[#aabbd2]"><Landmark className="size-3.5" /> Valor total</span><span className="font-data text-sm font-black text-[#5be6a0]">{formatMoney(payment.order.amountTotalCents, payment.order.currency)}</span></div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#d4af5a]/25 bg-[#121522]/75 p-4">
                    <Clock3 className="size-7 shrink-0 text-[#e6c46a]" />
                    <div><p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#e6c46a]">Prazo de entrega</p><p className="mt-1 text-sm font-bold text-[#f2ead8]">{deliveryTime}</p></div>
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-[#081224]/65 p-4">
                    <Headphones className="size-6 shrink-0 text-[#9dc9ff]" /><div className="min-w-0 flex-1"><p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#cbd9ea]">Dúvidas?</p><p className="mt-1 text-xs text-[#8294af]">Precisa de ajuda com o pagamento?</p></div><a href="mailto:support@lootmaster.com" className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-[#e7eef8] hover:border-[#d4af5a]/60">Abrir suporte</a>
                  </div>
                </>
              ) : !error ? <p className="mt-8 text-sm text-[#a9b9d0]">Carregando pagamento PIX...</p> : null}
            </div>

            <div className="min-w-0 rounded-xl border border-white/10 bg-[#081224]/55 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-7">
              <div className="text-center"><QrCode className="mx-auto size-5 text-[#e6c46a]" /><h2 className="mt-2 text-lg font-black text-[#edf2fa]">Escaneie o QR Code</h2><p className="mt-1 text-xs text-[#8fa3bf]">Abra o app do seu banco e escaneie o código abaixo</p></div>
              {payment ? (
                <>
                  <div className="mx-auto mt-5 w-fit rounded-2xl border border-[#e6c46a]/80 bg-white p-3 shadow-[0_0_34px_rgba(230,196,106,0.3)]"><Image src={`data:image/png;base64,${payment.qrCodeBase64}`} alt="QR Code PIX" width={288} height={288} unoptimized className="h-auto w-[min(68vw,288px)]" /></div>
                  <div className="my-5 flex items-center gap-3 text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#7e91ae]"><span className="h-px flex-1 bg-white/10" />OU<span className="h-px flex-1 bg-white/10" /></div>
                  <p className="text-center text-xs font-bold text-[#cbd9ea]">Copie o código PIX</p>
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-[#050b16] p-3"><p className="max-h-20 min-w-0 flex-1 overflow-y-auto break-all font-mono text-[0.67rem] leading-5 text-[#aabbd2]">{payment.qrCode}</p><button type="button" onClick={() => void copyPixCode()} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#d4af5a]/45 bg-[#d4af5a]/10 px-3 py-3 text-xs font-bold text-[#f1d68e] hover:bg-[#d4af5a]/20"><Clipboard className="size-4" />{copied ? "Copiado!" : "Copiar"}</button></div>
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 md:grid-cols-3">
            {[{ icon: QrCode, title: "Aguardando pagamento", text: "Aguardando confirmação do PIX" }, { icon: Clock3, title: "Processando", text: "Isso pode levar alguns segundos" }, { icon: Check, title: "Pagamento confirmado", text: "Seu pedido será entregue em breve" }].map((item, index) => { const Icon = item.icon; const active = stage >= index + 1; return <div key={item.title} className={`flex items-center gap-3 ${active ? "text-[#f0d27f]" : "text-[#657794]"}`}><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${active ? index === 2 && stage === 3 ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-300" : "border-[#d4af5a]/45 bg-[#d4af5a]/10" : "border-white/10 bg-white/[0.02]"}`}><Icon className="size-5" /></span><span className="min-w-0"><strong className="block text-xs font-black">{item.title}</strong><small className="mt-1 block text-[0.65rem] text-[#8092ab]">{item.text}</small></span></div>; })}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 border-t border-white/8 pt-5 text-[0.65rem] text-[#7f90a8]"><LockKeyhole className="size-3.5 text-[#5be6a0]" /> Ambiente 100% seguro <span className="text-white/20">|</span> Seus dados estão protegidos com criptografia.</div>
        </section>
        <div className="mt-5 text-center"><Link href="/" className="text-xs font-bold uppercase tracking-[0.16em] text-[#9fb0c6] hover:text-[#e6c46a]">Voltar para o início</Link></div>
      </main>
    </div>
  );
}

export default function PixPaymentPage() {
  return <div className="loot-shell"><Suspense><PixPaymentContent /></Suspense></div>;
}
