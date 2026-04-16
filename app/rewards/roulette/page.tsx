"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const wheelOptions = [
  { label: "Baú dourado", description: "Recompensa rara e valiosa.", color: "bg-[#f7ba2c]/15" },
  { label: "+500 coins", description: "Saldo instantâneo para usar no marketplace.", color: "bg-[#4dc6ff]/15" },
  { label: "+2 tickets", description: "Mais chances de girar novamente.", color: "bg-[#8dd0ff]/15" },
  { label: "+1 chave", description: "Chave para abrir um baú especial.", color: "bg-[#ffffff]/10" },
  { label: "Baú comum", description: "Recompensa básica para testar o sistema.", color: "bg-[#0f2a4e]/40" },
];

function getRandomResult() {
  const random = Math.random();
  if (random < 0.1) return wheelOptions[0];
  if (random < 0.4) return wheelOptions[1];
  if (random < 0.65) return wheelOptions[2];
  if (random < 0.85) return wheelOptions[3];
  return wheelOptions[4];
}

export default function RewardsRoulettePage() {
  const [result, setResult] = useState<typeof wheelOptions[number] | null>(null);
  const [spinning, setSpinning] = useState(false);

  const wheelText = useMemo(
    () => (result ? `${result.label} — ${result.description}` : "Clique em girar para ver o resultado."),
    [result]
  );

  const handleSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    window.setTimeout(() => {
      setResult(getRandomResult());
      setSpinning(false);
    }, 1200);
  };

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#ffc94d]">
            Roleta
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Tente a sorte
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Use seus tickets para girar a roleta e ganhar prêmios de inventário.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[1.75rem] border border-[#fff1be]/10 bg-[#06121d]/80 p-6">
              <h2 className="loot-title text-2xl font-black">Resultado atual</h2>
              <p className="loot-muted mt-4 text-sm leading-7">{wheelText}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSpin}
                  disabled={spinning}
                  className="loot-gold-button inline-flex rounded-full px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {spinning ? "Girando..." : "Girar agora"}
                </button>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="loot-secondary-button inline-flex rounded-full px-6 py-3 text-sm font-semibold transition-colors"
                >
                  Resetar resultado
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {wheelOptions.map((option) => (
                <div
                  key={option.label}
                  className={`rounded-[1.6rem] border border-[#fff1be]/10 p-5 ${option.color}`}
                >
                  <p className="loot-title text-xl font-black">{option.label}</p>
                  <p className="loot-muted mt-3 text-sm leading-7">{option.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/rewards" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Voltar para brindes
          </Link>
          <Link href="/profile/inventory" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Ver inventário
          </Link>
        </div>
      </main>
    </div>
  );
}
