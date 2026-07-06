"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useProfileSession } from "@/app/profile/use-profile-session";
import { CRAFT_RECIPES } from "@/lib/rpg-system";

type CraftRecipe = (typeof CRAFT_RECIPES)[number];

type ToastState = {
  id: number;
  kind: "success" | "error";
  text: string;
};

export default function CraftingPage() {
  const { status, profile, user, reload } = useProfileSession();

  const [recipes, setRecipes] = useState<CraftRecipe[]>(CRAFT_RECIPES);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadRecipes = async () => {
      try {
        const response = await fetch("/api/profile/crafting/recipes", { cache: "no-store" });
        const payload = (await response.json()) as { recipes?: CraftRecipe[] };

        if (!cancelled && response.ok && Array.isArray(payload.recipes)) {
          setRecipes(payload.recipes);
        }
      } catch {
        if (!cancelled) {
          setRecipes(CRAFT_RECIPES);
        }
      }
    };

    void loadRecipes();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const inventoryById = useMemo(() => {
    const map = new Map<string, number>();

    for (const item of profile?.inventory ?? []) {
      map.set(item.id, (map.get(item.id) ?? 0) + Math.max(0, Math.floor(item.quantity || 0)));
    }

    return map;
  }, [profile?.inventory]);

  const canCraft = (recipe: CraftRecipe): boolean => {
    return recipe.materials.every((material) => (inventoryById.get(material.itemId) ?? 0) >= material.quantity);
  };

  const craft = async (recipeId: string) => {
    if (!user || busyId) {
      return;
    }

    setBusyId(recipeId);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/profile/crafting/craft", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipeId, quantity: 1 }),
      });

      const payload = (await response.json()) as { error?: string; recipeTitle?: string; xpGain?: number };

      if (!response.ok) {
        setToast({ id: Date.now(), kind: "error", text: payload.error ?? "Craft failed." });
        return;
      }

      setToast({ id: Date.now(), kind: "success", text: `${payload.recipeTitle ?? "Item"} crafted (+${payload.xpGain ?? 0} XP).` });
      reload();
    } catch {
      setToast({ id: Date.now(), kind: "error", text: "Craft service unavailable." });
    } finally {
      setBusyId(null);
    }
  };

  if (status !== "authenticated" || !profile || !user) {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <h1 className="loot-title text-3xl font-black">Login required</h1>
            <p className="loot-muted mt-3 text-sm">Sign in to craft Gift Cards and Chests.</p>
            <Link href="/login" className="loot-gold-button mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold">Sign in</Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="loot-panel rounded-[2rem] p-6 sm:p-8">
          <p className="text-[0.64rem] font-black uppercase tracking-[0.2em] text-[color:var(--accent)]">Crafting</p>
          <h1 className="mt-2 text-4xl font-black text-[color:var(--text-main)]">Crafting Workshop</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)]">
            Craft Gift Cards and higher-tier Chests with fragments obtained from chest openings.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => {
            const recipeCraftable = canCraft(recipe);

            return (
              <article key={recipe.id} className="loot-panel rounded-2xl border border-white/14 p-5">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">{recipe.outputType}</p>
                <h2 className="mt-2 text-2xl font-black text-[color:var(--text-main)]">{recipe.title}</h2>
                <p className="mt-2 text-sm text-[color:var(--text-muted)]">{recipe.description}</p>

                <div className="mt-4 grid gap-2">
                  {recipe.materials.map((material) => {
                    const owned = inventoryById.get(material.itemId) ?? 0;
                    const enough = owned >= material.quantity;

                    return (
                      <p
                        key={`${recipe.id}-${material.itemId}`}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] ${
                          enough
                            ? "border-emerald-300/35 bg-emerald-500/12 text-emerald-100"
                            : "border-rose-300/35 bg-rose-500/12 text-rose-100"
                        }`}
                      >
                        {material.name}: {owned}/{material.quantity}
                      </p>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--accent)]">+{recipe.xpGain} XP</p>
                  <button
                    type="button"
                    onClick={() => void craft(recipe.id)}
                    disabled={busyId !== null || !recipeCraftable}
                    className="loot-gold-button rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed"
                  >
                    {busyId === recipe.id ? "Crafting..." : "Craft"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <div className="flex flex-wrap gap-2">
          <Link href="/rewards" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Battle Pass</Link>
          <Link href="/profile/inventory" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Inventory</Link>
        </div>
      </main>

      {toast ? (
        <div className="fixed right-4 top-4 z-[220] w-[min(92vw,420px)]">
          <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold backdrop-blur ${toast.kind === "success" ? "border-emerald-300/35 bg-emerald-500/16 text-emerald-100" : "border-rose-300/35 bg-rose-500/16 text-rose-100"}`}>
            {toast.text}
          </div>
        </div>
      ) : null}
    </div>
  );
}
