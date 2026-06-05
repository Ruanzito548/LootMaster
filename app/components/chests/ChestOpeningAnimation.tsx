"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Lottie from "lottie-react";

type AnimationFileDescriptor = {
  src: string;
  extension: string;
};

type AnimationManifestResponse = {
  files: string[];
  publicBasePath: string;
};

type ChestOpeningAnimationProps = {
  isOpen: boolean;
  openSequence: number;
  onComplete: () => void;
  chestRarity?: string;
  chestTitle?: string;
};

type LottieAnimationData = {
  fr?: number;
  ip?: number;
  op?: number;
};

const FALLBACK_DURATION_MS = 2200;

const OVERLAY_THEME: Record<string, { glow: string; ring: string; text: string; particle: string }> = {
  common: {
    glow: "bg-[radial-gradient(circle_at_center,rgba(215,223,236,0.24),transparent_62%)]",
    ring: "border-[#d7dfec]/35",
    text: "text-[#e6eef9]",
    particle: "bg-[#d7dfec]/55",
  },
  rare: {
    glow: "bg-[radial-gradient(circle_at_center,rgba(114,200,255,0.28),transparent_62%)]",
    ring: "border-[#5fb7ff]/38",
    text: "text-[#caeaff]",
    particle: "bg-[#72c8ff]/58",
  },
  epic: {
    glow: "bg-[radial-gradient(circle_at_center,rgba(215,164,255,0.3),transparent_62%)]",
    ring: "border-[#c286ff]/40",
    text: "text-[#edd6ff]",
    particle: "bg-[#d7a4ff]/60",
  },
  legendary: {
    glow: "bg-[radial-gradient(circle_at_center,rgba(255,217,160,0.3),transparent_62%)]",
    ring: "border-[#ffc46c]/44",
    text: "text-[#ffe9c5]",
    particle: "bg-[#ffd9a0]/62",
  },
  mythic: {
    glow: "bg-[radial-gradient(circle_at_center,rgba(255,177,190,0.34),transparent_62%)]",
    ring: "border-[#ff758b]/46",
    text: "text-[#ffd5dc]",
    particle: "bg-[#ffb1be]/64",
  },
};

function toDescriptor(basePath: string, fileName: string): AnimationFileDescriptor {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return {
    src: `${basePath}/${fileName}`,
    extension,
  };
}

function computeLottieDuration(data: LottieAnimationData | null): number {
  if (!data || typeof data.fr !== "number" || typeof data.ip !== "number" || typeof data.op !== "number" || data.fr <= 0) {
    return FALLBACK_DURATION_MS;
  }

  const frames = data.op - data.ip;

  if (frames <= 0) {
    return FALLBACK_DURATION_MS;
  }

  return Math.max(900, Math.round((frames / data.fr) * 1000));
}

export function ChestOpeningAnimation({ isOpen, openSequence, onComplete, chestRarity, chestTitle }: ChestOpeningAnimationProps) {
  const [files, setFiles] = useState<AnimationFileDescriptor[]>([]);
  const [lottieData, setLottieData] = useState<LottieAnimationData | null>(null);
  const [ready, setReady] = useState(false);
  const hasCompletedRef = useRef(false);
  const fallbackTimerRef = useRef<number | null>(null);

  const rarityKey = chestRarity && chestRarity in OVERLAY_THEME ? chestRarity : "common";
  const rarityTheme = OVERLAY_THEME[rarityKey];

  const selectedFile = useMemo(() => {
    return files[0] ?? null;
  }, [files]);

  const lottieDurationMs = useMemo(() => computeLottieDuration(lottieData), [lottieData]);

  useEffect(() => {
    let cancelled = false;

    const loadManifest = async () => {
      try {
        const response = await fetch("/api/animations", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not fetch animation manifest");
        }

        const manifest = (await response.json()) as AnimationManifestResponse;
        if (cancelled) {
          return;
        }

        const descriptors = manifest.files.map((fileName) => toDescriptor(manifest.publicBasePath, fileName));
        setFiles(descriptors);

        // Warm up image/video assets to reduce jank when the user opens a chest.
        descriptors.forEach((descriptor) => {
          if (["webm", "mp4"].includes(descriptor.extension)) {
            const video = document.createElement("video");
            video.preload = "auto";
            video.src = descriptor.src;
          }

          if (["gif", "png", "jpg", "jpeg", "webp", "avif"].includes(descriptor.extension)) {
            const image = new Image();
            image.src = descriptor.src;
          }
        });
      } catch {
        if (!cancelled) {
          setFiles([]);
        }
      }
    };

    void loadManifest();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedFile || selectedFile.extension !== "json") {
      setLottieData(null);
      return;
    }

    let cancelled = false;

    const loadLottie = async () => {
      try {
        const response = await fetch(selectedFile.src, { cache: "force-cache" });

        if (!response.ok) {
          throw new Error("Could not fetch lottie json");
        }

        const data = (await response.json()) as LottieAnimationData;

        if (!cancelled) {
          setLottieData(data);
        }
      } catch {
        if (!cancelled) {
          setLottieData(null);
        }
      }
    };

    void loadLottie();

    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!isOpen) {
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      hasCompletedRef.current = false;
      setReady(false);
      return;
    }

    hasCompletedRef.current = false;
    setReady(false);

    const fadeInDelay = 140;
    const mediaDuration = selectedFile?.extension === "json" ? lottieDurationMs : FALLBACK_DURATION_MS;
    const totalDuration = fadeInDelay + mediaDuration;

    fallbackTimerRef.current = window.setTimeout(() => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete();
      }
    }, totalDuration);

    return () => {
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [isOpen, lottieDurationMs, onComplete, selectedFile]);

  const completeFromMedia = () => {
    if (hasCompletedRef.current) {
      return;
    }

    hasCompletedRef.current = true;
    onComplete();
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key={`chest-opening-${openSequence}`}
          className="fixed inset-0 z-[180] flex items-center justify-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          aria-live="polite"
          aria-label="Opening chest animation"
        >
          <motion.div
            className="absolute inset-0 bg-black/78 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
          />

          <motion.div
            className={`pointer-events-none absolute inset-0 ${rarityTheme.glow}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.42, 0.22] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.15, ease: "easeInOut" }}
          />

          {Array.from({ length: 14 }).map((_, index) => (
            <motion.span
              key={`opening-particle-${openSequence}-${index}`}
              className={`pointer-events-none absolute rounded-full ${rarityTheme.particle}`}
              style={{
                width: index % 2 === 0 ? 3 : 2,
                height: index % 2 === 0 ? 3 : 2,
                left: `${15 + ((index * 7.3) % 70)}%`,
                top: `${18 + ((index * 9.7) % 56)}%`,
              }}
              animate={{ y: [0, -14, 0], opacity: [0.2, 0.9, 0.2], scale: [1, 1.25, 1] }}
              transition={{
                duration: 2.1 + (index % 4) * 0.45,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
                delay: index * 0.07,
              }}
            />
          ))}

          <motion.div
            className={`relative w-full max-w-[460px] overflow-hidden rounded-3xl border ${rarityTheme.ring} bg-[radial-gradient(circle_at_top,rgba(99,201,255,0.22),rgba(3,10,20,0.82)_56%,rgba(2,7,14,0.94)_100%)] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:p-6`}
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: [0, -2, 2, -1, 1, 0] }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-3xl bg-white/20"
              initial={{ opacity: 0.22 }}
              animate={{ opacity: [0.34, 0.06, 0] }}
              transition={{ duration: 0.48, ease: "easeOut" }}
            />
            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" />

            <div className="relative mb-3 flex items-center justify-between gap-2">
              <p className={`text-[0.62rem] font-black uppercase tracking-[0.18em] ${rarityTheme.text}`}>
                {chestTitle ?? "Chest"}
              </p>
              <span className={`rounded-full border px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] ${rarityTheme.ring} ${rarityTheme.text}`}>
                {rarityKey}
              </span>
            </div>

            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black/35">
              {selectedFile?.extension === "json" && lottieData ? (
                <Lottie
                  animationData={lottieData}
                  loop={false}
                  autoplay
                  onComplete={completeFromMedia}
                  className="h-full w-full"
                  rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
                />
              ) : selectedFile?.extension === "webm" || selectedFile?.extension === "mp4" ? (
                <video
                  key={selectedFile.src}
                  className="h-full w-full object-cover"
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  onCanPlay={() => setReady(true)}
                  onEnded={completeFromMedia}
                >
                  <source src={selectedFile.src} type={selectedFile.extension === "webm" ? "video/webm" : "video/mp4"} />
                </video>
              ) : selectedFile ? (
                <img
                  src={selectedFile.src}
                  alt="Chest opening"
                  className="h-full w-full object-cover"
                  onLoad={() => setReady(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold uppercase tracking-[0.16em] text-[#c4e7ff]">
                  Opening chest...
                </div>
              )}
            </div>

            <p className={`mt-4 text-center text-xs font-bold uppercase tracking-[0.18em] sm:text-sm ${rarityTheme.text}`}>
              Opening chest...
            </p>

            <motion.div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
              initial={{ opacity: 0.72 }}
              animate={{ opacity: ready ? 1 : 0.86 }}
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#62d7ff] via-[#7df5ff] to-[#c9feff]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: Math.max(1.2, (selectedFile?.extension === "json" ? lottieDurationMs : FALLBACK_DURATION_MS) / 1000), ease: "linear" }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
