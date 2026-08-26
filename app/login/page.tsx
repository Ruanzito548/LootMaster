"use client";

import Link from "next/link";
import { ArrowRight, Shield, Sparkles, Users } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  type User,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithPopup,
} from "firebase/auth";

import { auth, firebaseEnabled } from "../../lib/firebase";
import { getFriendlyAuthError } from "../../lib/auth-errors";
import { ensureUserProfileDoc } from "../../lib/profile-data";

const DISCORD_ERROR_LABELS: Record<string, string> = {
  access_denied: "Discord access denied. Please try again.",
  token_exchange_failed: "Could not exchange Discord token. Please try again.",
  user_fetch_failed: "Could not fetch your Discord profile. Please try again.",
  server_misconfigured: "Discord OAuth is not configured on this server.",
};

const benefits = [
  { icon: Shield, title: "100% SECURE", text: "Your data is safe with us", accent: "text-[#d9b76a]" },
  { icon: Sparkles, title: "INSTANT ACCESS", text: "Get in the game in seconds", accent: "text-[#8fc1ff]" },
  { icon: Users, title: "COMMUNITY", text: "Join thousands of players", accent: "text-[#d7a8ff]" },
] as const;

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<"google" | "discord" | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const referralProcessedRef = useRef(false);
  const linkToken = (params.get("token") ?? "").trim();

  const applyStoredReferral = async (user: User) => {
    if (referralProcessedRef.current) {
      return;
    }

    const referral = (sessionStorage.getItem("signup_referral") ?? "").trim();
    if (!referral) {
      referralProcessedRef.current = true;
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/profile/apply-referral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ referralCode: referral }),
      });

      if (response.ok) {
        sessionStorage.removeItem("signup_referral");
      }
    } catch {
      // Keep referral in storage for a later retry if network/server is unavailable.
    } finally {
      referralProcessedRef.current = true;
    }
  };

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (user) => {
      setLoggedIn(Boolean(user));

      if (user) {
        void applyStoredReferral(user);
      }
    });
  }, []);

  useEffect(() => {
    const customToken = params.get("customToken");
    const error = params.get("error");

    if (error) {
      setErrorMessage(DISCORD_ERROR_LABELS[error] ?? "An error occurred. Please try again.");
      setPendingProvider(null);
      setLoading(false);
      return;
    }

    if (!customToken || !auth) {
      return;
    }

    setLoading(true);
    setPendingProvider("discord");
    signInWithCustomToken(auth, customToken)
      .then(() => router.replace("/"))
      .catch((err: unknown) => {
        if (err instanceof FirebaseError) {
          setErrorMessage(getFriendlyAuthError(err.code, "Could not sign in."));
        } else {
          setErrorMessage(err instanceof Error ? err.message : "Could not sign in.");
        }
        setLoading(false);
        setPendingProvider(null);
      });
  }, [params, router]);

  useEffect(() => {
    if (!auth) {
      return;
    }

    if (loggedIn) {
      router.replace("/");
    }
  }, [loggedIn, router]);

  const loginWithDiscord = () => {
    if (!auth || loading || loggedIn) {
      return;
    }

    const authUrl = new URL("/api/auth/discord", window.location.origin);
    if (linkToken) {
      authUrl.searchParams.set("linkToken", linkToken);
    }
    window.location.href = authUrl.toString();
  };

  const loginWithGoogle = async () => {
    if (!auth || loading || loggedIn) {
      return;
    }

    setLoading(true);
    setPendingProvider("google");
    setErrorMessage(null);

    try {
      const provider = new GoogleAuthProvider();
      const credentials = await signInWithPopup(auth, provider);
      await ensureUserProfileDoc(credentials.user, {
        username: credentials.user.displayName ?? undefined,
        email: credentials.user.email ?? undefined,
      });
      router.replace("/");
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        setErrorMessage(getFriendlyAuthError(err.code, "Could not sign in with Google."));
      } else {
        setErrorMessage(err instanceof Error ? err.message : "Could not sign in with Google.");
      }
    } finally {
      setLoading(false);
      setPendingProvider(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070a] text-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/home/bghero.png')", backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(5,7,10,0.2),rgba(5,7,10,0.8)_50%,rgba(5,7,10,0.96))]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="grid w-full items-center gap-7 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="relative flex min-h-[620px] items-center justify-center overflow-hidden rounded-[2rem] border border-[#d4af6a]/70 bg-[#05070a]/30 px-4 py-10 shadow-[0_30px_100px_rgba(0,0,0,0.65)] sm:px-6 lg:min-h-[760px] lg:px-8">
            <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
              <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_50%_35%,rgba(212,175,106,0.16),transparent_24%)]" />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.18)_30%,rgba(0,0,0,0.68))]" />
            </div>

            <div className="relative z-10 flex w-full max-w-[780px] flex-col items-center justify-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 -m-8 rounded-[30%] bg-[radial-gradient(circle,rgba(212,175,106,0.18),transparent_62%)] blur-3xl" />
                <div className="relative flex h-[18rem] w-[18rem] items-center justify-center rounded-[2.5rem] border border-[#d4af6a]/65 bg-[#090d12]/60 shadow-[0_0_40px_rgba(212,175,106,0.2)] sm:h-[22rem] sm:w-[22rem] lg:h-[28rem] lg:w-[28rem]">
                  <div className="absolute inset-3 rounded-[2rem] border border-[#d4af6a]/25" />
                  <span className="font-throne text-[9rem] leading-none tracking-[-0.18em] text-[#f1bf52] drop-shadow-[0_0_28px_rgba(212,175,106,0.38)] sm:text-[11rem] lg:text-[15rem]">
                    LM
                  </span>
                </div>
              </div>

              <div className="mt-3 text-center">
                <div className="flex items-center justify-center gap-2 sm:gap-4">
                  <span className="font-throne text-[2.2rem] font-black uppercase tracking-[0.08em] text-[#f3c963] sm:text-[3.1rem] lg:text-[4.5rem]">LOOT</span>
                  <span className="font-throne text-[2.2rem] font-black uppercase tracking-[0.08em] text-[#e2e7ea] opacity-90 sm:text-[3.1rem] lg:text-[4.5rem]">MASTER</span>
                </div>
                <div className="mx-auto mt-3 h-px w-full max-w-[30rem] bg-[linear-gradient(90deg,transparent,rgba(212,175,106,0.9),rgba(212,175,106,0.2),transparent)]" />
              </div>

              <div className="mt-6 text-center text-[#f6d27c] uppercase tracking-[0.42em] text-[0.62rem] font-bold sm:text-[0.72rem]">
                YOUR ADVENTURE STARTS HERE
              </div>

              <p className="mt-5 max-w-[32rem] text-center text-sm leading-7 text-[#d4dce6] opacity-90 sm:text-base">
                Access exclusive games, epic loot and a community of adventurers.
              </p>

              <div className="mt-9 flex w-full max-w-[35rem] items-end justify-center gap-3 sm:gap-6">
                <div className="relative h-28 w-40 rounded-[1.3rem] border border-[#d4af6a]/55 bg-[linear-gradient(180deg,rgba(15,21,28,0.2),rgba(13,17,23,0.6))] shadow-[inset_0_0_20px_rgba(212,175,106,0.15)] sm:h-32 sm:w-48">
                  <div className="absolute inset-x-4 bottom-7 h-8 rounded-t-[0.8rem] border border-[#d4af6a]/60 bg-[linear-gradient(180deg,#d9a94d,#b57a23)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]" />
                  <div className="absolute inset-x-7 bottom-2 h-5 rounded-[0.55rem] border border-[#d4af6a]/65 bg-[linear-gradient(180deg,#f4d48a,#b97d2e)]" />
                  <div className="absolute left-1/2 top-3 h-3 w-3 -translate-x-1/2 rounded-full border border-[#d4af6a]/60 bg-[#f6d27c] shadow-[0_0_12px_rgba(246,210,124,0.6)]" />
                  <div className="absolute -left-2 bottom-10 h-6 w-6 rounded-full border border-[#d4af6a]/60 bg-[#f4d48a] shadow-[0_0_12px_rgba(212,175,106,0.4)]" />
                  <div className="absolute -right-2 bottom-10 h-6 w-6 rounded-full border border-[#d4af6a]/60 bg-[#f4d48a] shadow-[0_0_12px_rgba(212,175,106,0.4)]" />
                </div>
                <div className="flex items-end gap-2 pb-4 text-[#f4d48a]">
                  <span className="inline-block h-4 w-4 rounded-full bg-[#f4d48a] shadow-[0_0_16px_rgba(244,212,138,0.9)]" />
                  <span className="inline-block h-3 w-3 rounded-full bg-[#d99a22]" />
                  <span className="inline-block h-2 w-2 rounded-full bg-[#f7df90]" />
                </div>
              </div>
            </div>
          </section>

          <aside className="relative mx-auto w-full max-w-[620px] rounded-[2rem] border border-[#d4af6a]/75 bg-[#07090d]/80 p-5 shadow-[0_22px_72px_rgba(0,0,0,0.7)] backdrop-blur-sm sm:p-7 lg:p-8">
            <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(88,101,242,0.08),transparent_25%)]" />

            <div className="relative z-10">
              <div className="text-center uppercase tracking-[0.28em] text-[0.6rem] font-bold text-[#d9b76a] sm:text-[0.68rem]">
                WELCOME BACK
              </div>

              <h1 className="mt-5 text-center text-5xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-white sm:text-6xl">
                ENTER THE <span className="text-[#d9b76a]">GAME</span>
              </h1>

              <div className="mx-auto mt-5 h-px w-full max-w-[20rem] bg-[linear-gradient(90deg,transparent,rgba(212,175,106,0.9),rgba(212,175,106,0.2),transparent)]" />

              <p className="mt-5 text-center text-sm leading-7 text-[#dfe8f7] opacity-80 sm:text-base">
                Access your account and continue your journey.
                <span className="mt-1 block">Epic loot and adventures await you.</span>
              </p>

              <div className="mt-8 flex items-center justify-center gap-3 text-[#d9b76a]">
                <div className="h-px w-8 bg-[#d9b76a]/80" />
                <span className="inline-flex h-2.5 w-2.5 rotate-45 border border-[#d9b76a] bg-[#d9b76a]/20 shadow-[0_0_14px_rgba(212,175,106,0.5)]" />
                <div className="h-px w-8 bg-[#d9b76a]/80" />
              </div>

              <div className="mt-8 space-y-4">
                <button
                  type="button"
                  onClick={loginWithDiscord}
                  disabled={loading || loggedIn || !firebaseEnabled}
                  className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[#5865F2]/80 bg-[linear-gradient(180deg,#5865F2,#4a58d9)] px-4 py-4 text-left text-base font-black uppercase tracking-[0.08em] text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(88,101,242,0.38)] disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-lg shadow-inner shadow-white/10">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-white">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                      </svg>
                    </span>
                    <span>{pendingProvider === "discord" && loading ? "CONNECTING..." : "CONTINUE WITH DISCORD"}</span>
                  </span>
                  <ArrowRight className="h-5 w-5 text-white transition-transform duration-300 group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  onClick={() => void loginWithGoogle()}
                  disabled={loading || loggedIn || !firebaseEnabled || Boolean(linkToken)}
                  className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[#d4af6a]/70 bg-[#0b1017]/80 px-4 py-4 text-left text-base font-black uppercase tracking-[0.08em] text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(212,175,106,0.28)] disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#111821] text-lg shadow-inner shadow-[#d4af6a]/10">
                      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#EA4335" d="M12 10.2v3.9h5.48c-.24 1.26-.96 2.33-2.04 3.06l3.3 2.56c1.92-1.77 3.03-4.37 3.03-7.46 0-.73-.07-1.43-.19-2.1H12z" />
                        <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.3-2.56c-.92.62-2.09.99-3.32.99-2.55 0-4.71-1.72-5.48-4.02H3.1v2.63A10 10 0 0 0 12 22z" />
                        <path fill="#4A90E2" d="M6.52 13.98A5.98 5.98 0 0 1 6.2 12c0-.69.12-1.36.32-1.98V7.39H3.1A10 10 0 0 0 2 12c0 1.61.38 3.14 1.1 4.61l3.42-2.63z" />
                        <path fill="#FBBC05" d="M12 5.98c1.47 0 2.79.5 3.83 1.48l2.87-2.87C16.97 2.98 14.7 2 12 2a10 10 0 0 0-8.9 5.39l3.42 2.63C7.29 7.7 9.45 5.98 12 5.98z" />
                      </svg>
                    </span>
                    <span>{pendingProvider === "google" && loading ? "CONNECTING..." : "CONTINUE WITH GOOGLE"}</span>
                  </span>
                  <ArrowRight className="h-5 w-5 text-[#f3d27a] transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {benefits.map(({ icon: Icon, title, text, accent }) => (
                  <div key={title} className="rounded-xl border border-[#d4af6a]/25 bg-[#0a1017]/60 px-3 py-4 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#d4af6a]/40 bg-[#111922]">
                      <Icon className={`h-4 w-4 ${accent}`} />
                    </div>
                    <p className="mt-3 text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#f1c96b]">{title}</p>
                    <p className="mt-1 text-[0.68rem] leading-5 text-[#dfe8f7] opacity-80">{text}</p>
                  </div>
                ))}
              </div>

              {errorMessage ? (
                <div className="mt-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">
                  {errorMessage}
                </div>
              ) : null}

              <div className="mt-6 text-center text-[0.72rem] leading-6 text-[#c9d1dd] opacity-85">
                By continuing, you agree to our <Link href="/terms" className="text-[#f3c963] transition-colors hover:text-[#f9d98d]">Terms of Service</Link> and <Link href="/privacy" className="text-[#f3c963] transition-colors hover:text-[#f9d98d]">Privacy Policy</Link>.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="loot-shell flex min-h-screen items-center justify-center text-sm uppercase tracking-[0.2em] text-[#d9b76a]">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

