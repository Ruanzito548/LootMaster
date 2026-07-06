"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, Hammer, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useProfileSession } from "@/app/profile/use-profile-session";
import { CRAFT_RECIPES } from "@/lib/rpg-system";

type CraftRecipe = (typeof CRAFT_RECIPES)[number];
type RecipeCategory = "gift-cards" | "chests";

type ToastState = {
  id: number;
  kind: "success" | "error";
  text: string;
};

type ConfettiBurst = {
  id: number;
  x: number;
  y: number;
};

type CategoryDefinition = {
  id: RecipeCategory;
  label: string;
  subtitle: string;
};

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  { id: "gift-cards", label: "Gift Cards", subtitle: "Steam, Blizzard, Riot, Google Play, Xbox" },
  { id: "chests", label: "Chests", subtitle: "Forge higher tier chests from fragments" },
];

const PLATFORM_VISUALS: Record<string, { short: string; tint: string; ring: string }> = {
  steam: { short: "ST", tint: "from-[#1b3e5f] to-[#5ca6ff]", ring: "border-[#63b6ff]/40" },
  blizzard: { short: "BZ", tint: "from-[#1f4ca1] to-[#8ad2ff]", ring: "border-[#77beff]/40" },
  riot: { short: "RG", tint: "from-[#732d2d] to-[#ff5d5d]", ring: "border-[#ff7474]/40" },
  "google-play": { short: "GP", tint: "from-[#0e7e5a] to-[#8bf7c1]", ring: "border-[#77f0be]/40" },
  xbox: { short: "XB", tint: "from-[#1c7a2f] to-[#8eff8a]", ring: "border-[#8eff8a]/40" },
};

function getPlatformFromRecipe(recipe: CraftRecipe): string {
  if (!recipe.id.startsWith("craft-gift-card-")) {
    return "";
  }

  const suffix = recipe.id.slice("craft-gift-card-".length);
  const lastDash = suffix.lastIndexOf("-");
  return lastDash >= 0 ? suffix.slice(0, lastDash) : suffix;
}

function getValueFromRecipe(recipe: CraftRecipe): number {
  const match = recipe.title.match(/\$(\d+)/);
  return match ? Number(match[1]) : 0;
}

function getRecipeCategory(recipe: CraftRecipe): RecipeCategory {
  return recipe.id.startsWith("craft-gift-card-") ? "gift-cards" : "chests";
}

function getOwnedById(inventory: Array<{ id: string; quantity: number }> | undefined): Map<string, number> {
  const map = new Map<string, number>();

  for (const item of inventory ?? []) {
    map.set(item.id, (map.get(item.id) ?? 0) + Math.max(0, Math.floor(item.quantity || 0)));
  }

  return map;
}

function playCraftSound(): void {
  try {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    const ctx = new AudioContextCtor();
    const now = ctx.currentTime;

    const notes = [480, 720, 980];
    notes.forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.11, now + index * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.18);
    });

    window.setTimeout(() => {
      void ctx.close();
    }, 500);
  } catch {
    // Sound is optional enhancement.
  }
}

export default function CraftingPage() {
  const { status, profile, user, reload } = useProfileSession();

  const [recipes, setRecipes] = useState<CraftRecipe[]>(CRAFT_RECIPES);
  const [openCategory, setOpenCategory] = useState<RecipeCategory>("gift-cards");
  const [busyRecipeId, setBusyRecipeId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confettiBursts, setConfettiBursts] = useState<ConfettiBurst[]>([]);

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

    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const inventoryById = useMemo(() => getOwnedById(profile?.inventory), [profile?.inventory]);

  const groupedGiftCards = useMemo(() => {
    const groupMap = new Map<string, CraftRecipe[]>();

    for (const recipe of recipes.filter((recipe) => getRecipeCategory(recipe) === "gift-cards")) {
      const platform = getPlatformFromRecipe(recipe);
      const current = groupMap.get(platform) ?? [];
      current.push(recipe);
      groupMap.set(platform, current);
    }

    for (const entry of groupMap.values()) {
      entry.sort((a, b) => getValueFromRecipe(a) - getValueFromRecipe(b));
    }

    return Array.from(groupMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [recipes]);

  const chestRecipes = useMemo(
    () => recipes.filter((recipe) => getRecipeCategory(recipe) === "chests").sort((a, b) => a.title.localeCompare(b.title)),
    [recipes],
  );

  const canCraft = (recipe: CraftRecipe): boolean =>
    recipe.materials.every((material) => (inventoryById.get(material.itemId) ?? 0) >= material.quantity);

  const getProgress = (recipe: CraftRecipe): { current: number; required: number; percent: number } => {
    const required = recipe.materials[0]?.quantity ?? 1;
    const current = inventoryById.get(recipe.materials[0]?.itemId ?? "") ?? 0;
    const percent = Math.max(0, Math.min(100, Math.round((Math.min(current, required) / required) * 100)));

    return { current, required, percent };
  };

  const triggerConfetti = (x: number, y: number) => {
    const id = Date.now();
    setConfettiBursts((current) => [...current, { id, x, y }]);
    window.setTimeout(() => {
      setConfettiBursts((current) => current.filter((burst) => burst.id !== id));
    }, 900);
  };

  const craftRecipe = async (recipe: CraftRecipe, event: React.MouseEvent<HTMLButtonElement>) => {
    if (!user || busyRecipeId) {
      return;
    }

    setBusyRecipeId(recipe.id);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/profile/crafting/craft", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipeId: recipe.id, quantity: 1 }),
      });

      const payload = (await response.json()) as { error?: string; recipeTitle?: string; xpGain?: number };

      if (!response.ok) {
        setToast({ id: Date.now(), kind: "error", text: payload.error ?? "Craft failed." });
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      triggerConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      playCraftSound();
      setToast({ id: Date.now(), kind: "success", text: `${payload.recipeTitle ?? recipe.title} crafted (+${payload.xpGain ?? 0} XP)` });
      reload();
    } catch {
      setToast({ id: Date.now(), kind: "error", text: "Craft service unavailable." });
    } finally {
      setBusyRecipeId(null);
    }
  };

  if (status !== "authenticated" || !profile || !user) {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <h1 className="loot-title text-3xl font-black">Login required</h1>
            <p className="loot-muted mt-3 text-sm">Sign in to access the Crafting Workbench.</p>
            <Link href="/login" className="loot-gold-button mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold">Sign in</Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="loot-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(88,182,255,0.2),transparent_35%),radial-gradient(circle_at_85%_18%,rgba(110,255,177,0.16),transparent_34%),radial-gradient(circle_at_52%_100%,rgba(255,171,91,0.14),transparent_40%)]" />
          <div className="relative">
            <p className="text-[0.64rem] font-black uppercase tracking-[0.2em] text-[color:var(--accent)]">MMORPG Workbench</p>
            <h1 className="mt-2 text-4xl font-black text-[color:var(--text-main)] sm:text-5xl">Crafting Station</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)]">
              Expand categories, inspect each recipe, track your fragment progress, and forge items with premium RPG-style feedback.
            </p>
          </div>
        </section>

        <section className="grid gap-4">
          {CATEGORY_DEFINITIONS.map((category) => {
            const isOpen = openCategory === category.id;
            const categoryRecipes = category.id === "gift-cards" ? groupedGiftCards.flatMap(([, items]) => items) : chestRecipes;

            return (
              <article key={category.id} className="loot-panel overflow-hidden rounded-[1.7rem] border border-white/12">
                <button
                  type="button"
                  onClick={() => setOpenCategory(category.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-white/5"
                >
                  <div>
                    <p className="text-lg font-black uppercase tracking-[0.08em] text-[color:var(--text-main)]">{category.label}</p>
                    <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{category.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[color:var(--accent)]">
                    <span className="text-[0.65rem] font-black uppercase tracking-[0.14em]">{categoryRecipes.length} recipes</span>
                    {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className="overflow-hidden border-t border-white/10"
                    >
                      <div className="grid gap-4 p-5">
                        {category.id === "gift-cards" ? (
                          groupedGiftCards.map(([platform, items]) => {
                            const visual = PLATFORM_VISUALS[platform] ?? {
                              short: platform.slice(0, 2).toUpperCase(),
                              tint: "from-[#2f3d4f] to-[#91a4be]",
                              ring: "border-white/20",
                            };

                            return (
                              <section key={platform} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <div className="mb-4 flex items-center gap-3">
                                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${visual.ring} bg-gradient-to-br ${visual.tint}`}>
                                    <span className="text-sm font-black uppercase text-white">{visual.short}</span>
                                  </div>
                                  <div>
                                    <p className="text-lg font-black text-[color:var(--text-main)]">{platform.replace(/-/g, " ")}</p>
                                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">Gift Cards</p>
                                  </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  {items.map((recipe) => {
                                    const progress = getProgress(recipe);
                                    const craftable = canCraft(recipe);
                                    const isBusy = busyRecipeId === recipe.id;

                                    return (
                                      <article key={recipe.id} className="rounded-2xl border border-white/12 bg-[linear-gradient(165deg,rgba(10,18,34,0.94),rgba(6,11,24,0.95))] p-4">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className={`flex h-14 w-14 items-center justify-center rounded-xl border ${visual.ring} bg-gradient-to-br ${visual.tint}`}>
                                            <span className="text-base font-black text-white">{visual.short}</span>
                                          </div>
                                          <span className="rounded-full border border-white/14 bg-white/8 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#d5e7fb]"><Sparkles className="mr-1 inline h-3 w-3" />{recipe.outputItem.rarity}</span>
                                        </div>

                                        <h3 className="mt-3 text-xl font-black text-[color:var(--text-main)]">{recipe.title}</h3>
                                        <p className="mt-1 text-sm text-[color:var(--text-muted)]">{recipe.description}</p>

                                        <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
                                          <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">Fragments</p>
                                          <p className="mt-1 text-sm font-black text-[color:var(--text-main)]">{progress.current} / {progress.required}</p>
                                          <div className="mt-2 h-2 overflow-hidden rounded-full border border-white/10 bg-black/40">
                                            <div className={`h-full rounded-full bg-[linear-gradient(90deg,#58b6ff,#6ee7f7,#35d27d)] transition-all duration-500 ${progress.percent >= 100 ? "craft-bar-complete" : ""}`} style={{ width: `${progress.percent}%` }} />
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={(event) => void craftRecipe(recipe, event)}
                                          disabled={!craftable || busyRecipeId !== null}
                                          className={`mt-4 inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition-all ${craftable ? "bg-[linear-gradient(90deg,#22c55e,#4ade80)] text-[#03240f] hover:shadow-[0_0_24px_rgba(74,222,128,0.45)] active:scale-[0.98]" : "cursor-not-allowed border border-rose-300/35 bg-rose-500/14 text-rose-100"}`}
                                        >
                                          {isBusy ? "Crafting..." : craftable ? "Craft" : "Missing Materials"}
                                        </button>
                                      </article>
                                    );
                                  })}
                                </div>
                              </section>
                            );
                          })
                        ) : (
                          <>
                            <article className="rounded-2xl border border-white/12 bg-[linear-gradient(165deg,rgba(18,18,24,0.92),rgba(9,11,18,0.95))] p-5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#d2d6de]/30 bg-[#d2d6de]/12">
                                  <Hammer className="h-7 w-7 text-[#d2d6de]" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-black text-[color:var(--text-main)]">Common Chest</h3>
                                  <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">Not craftable. Obtained only through Battle Pass progression.</p>
                                </div>
                              </div>
                            </article>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {chestRecipes.map((recipe) => {
                                const progress = getProgress(recipe);
                                const craftable = canCraft(recipe);
                                const isBusy = busyRecipeId === recipe.id;

                                return (
                                  <article key={recipe.id} className="rounded-2xl border border-white/12 bg-[linear-gradient(165deg,rgba(10,18,34,0.94),rgba(6,11,24,0.95))] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/15 bg-black/30">
                                        <img src="/chest.png" alt="Chest" className="h-10 w-10 object-contain" />
                                      </div>
                                      <span className="rounded-full border border-white/14 bg-white/8 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#d5e7fb]">
                                        {recipe.outputItem.rarity}
                                      </span>
                                    </div>

                                    <h3 className="mt-3 text-xl font-black text-[color:var(--text-main)]">{recipe.title}</h3>
                                    <p className="mt-1 text-sm text-[color:var(--text-muted)]">{recipe.description}</p>

                                    <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
                                      <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">Required Materials</p>
                                      {recipe.materials.map((material) => {
                                        const owned = inventoryById.get(material.itemId) ?? 0;
                                        const needed = material.quantity;
                                        const percent = Math.max(0, Math.min(100, Math.round((Math.min(owned, needed) / needed) * 100)));

                                        return (
                                          <div key={`${recipe.id}-${material.itemId}`} className="mt-2">
                                            <p className="text-sm font-semibold text-[color:var(--text-main)]">{material.name}</p>
                                            <p className="text-xs font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{owned} / {needed}</p>
                                            <div className="mt-1 h-2 overflow-hidden rounded-full border border-white/10 bg-black/40">
                                              <div className={`h-full rounded-full bg-[linear-gradient(90deg,#58b6ff,#6ee7f7,#35d27d)] transition-all duration-500 ${percent >= 100 ? "craft-bar-complete" : ""}`} style={{ width: `${percent}%` }} />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={(event) => void craftRecipe(recipe, event)}
                                      disabled={!craftable || busyRecipeId !== null}
                                      className={`mt-4 inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition-all ${craftable ? "bg-[linear-gradient(90deg,#22c55e,#4ade80)] text-[#03240f] hover:shadow-[0_0_24px_rgba(74,222,128,0.45)] active:scale-[0.98]" : "cursor-not-allowed border border-rose-300/35 bg-rose-500/14 text-rose-100"}`}
                                    >
                                      {isBusy ? "Crafting..." : craftable ? "Craft" : "Missing Materials"}
                                    </button>
                                  </article>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </article>
            );
          })}
        </section>
      </main>

      {toast ? (
        <div className="fixed right-4 top-4 z-[220] w-[min(92vw,420px)]">
          <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold backdrop-blur ${toast.kind === "success" ? "border-emerald-300/35 bg-emerald-500/16 text-emerald-100" : "border-rose-300/35 bg-rose-500/16 text-rose-100"}`}>
            {toast.text}
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none fixed inset-0 z-[230] overflow-hidden">
        {confettiBursts.map((burst) => (
          <div key={burst.id} className="absolute" style={{ left: burst.x, top: burst.y }}>
            {Array.from({ length: 16 }).map((_, index) => (
              <span
                key={`${burst.id}-${index}`}
                className="craft-confetti"
                style={{
                  ["--dx" as string]: `${Math.cos((index / 16) * Math.PI * 2) * (42 + (index % 4) * 12)}px`,
                  ["--dy" as string]: `${Math.sin((index / 16) * Math.PI * 2) * (42 + (index % 5) * 10)}px`,
                  ["--rot" as string]: `${index * 28}deg`,
                  ["--delay" as string]: `${index * 0.012}s`,
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <style jsx global>{`
        .craft-bar-complete {
          box-shadow: 0 0 22px rgba(74, 222, 128, 0.45);
          animation: craftBarPulse 1.35s ease-in-out infinite;
        }

        @keyframes craftBarPulse {
          0%,
          100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.22);
          }
        }

        .craft-confetti {
          position: absolute;
          width: 7px;
          height: 10px;
          border-radius: 2px;
          background: linear-gradient(180deg, #67e8f9, #4ade80);
          animation: craftConfetti 0.82s ease-out forwards;
          animation-delay: var(--delay);
          transform: translate(-50%, -50%);
        }

        .craft-confetti:nth-child(3n) {
          background: linear-gradient(180deg, #facc15, #fb7185);
        }

        .craft-confetti:nth-child(4n) {
          background: linear-gradient(180deg, #a78bfa, #60a5fa);
        }

        @keyframes craftConfetti {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(0deg) scale(0.8);
          }
          10% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--rot)) scale(0.6);
          }
        }
      `}</style>
    </div>
  );
}
