"use client";

import Link from "next/link";
import { useState } from "react";

import { defaultCoverURL, defaultPhotoURL } from "../../../lib/profile-data";
import { useProfileSession } from "../use-profile-session";

export default function ProfileCoverPage() {
  const { status, profile, saveProfile } = useProfileSession();
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [coverURL, setCoverURL] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const resolvedPhoto = photoURL ?? profile?.photoURL ?? defaultPhotoURL;
  const resolvedCover = coverURL ?? profile?.coverURL ?? defaultCoverURL;

  const save = async () => {
    setSaving(true);
    const ok = await saveProfile({ photoURL: resolvedPhoto, coverURL: resolvedCover });
    setFeedback(ok ? "Appearance saved successfully." : "Failed to save appearance.");
    setSaving(false);
  };

  if (status !== "authenticated" || !profile) {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[2rem] p-8">
            <h1 className="loot-title text-3xl font-black">Access your account</h1>
            <p className="loot-muted mt-3 text-sm">Log in to edit your cover and profile photo.</p>
            <Link href="/login" className="loot-gold-button mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold">
              Go to login
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">Appearance</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Cover and profile photo</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Set image URLs to customize your profile identity.
          </p>
        </div>

        <section className="loot-panel mt-8 overflow-hidden rounded-[2rem] p-0">
          <div className="h-48 w-full bg-cover bg-center" style={{ backgroundImage: `url(${resolvedCover || defaultCoverURL})` }} />
          <div className="p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedPhoto || defaultPhotoURL}
              alt="Preview avatar"
              className="-mt-20 h-24 w-24 rounded-full border-2 border-[#ffd76a]/40 bg-[#07111f] object-cover"
            />

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                Avatar URL
                <input
                  value={resolvedPhoto}
                  onChange={(event) => setPhotoURL(event.target.value)}
                  className="loot-input px-4 py-3 text-sm font-semibold"
                  placeholder="https://..."
                />
              </label>
              <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                Cover URL
                <input
                  value={resolvedCover}
                  onChange={(event) => setCoverURL(event.target.value)}
                  className="loot-input px-4 py-3 text-sm font-semibold"
                  placeholder="https://..."
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="loot-gold-button inline-flex rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save appearance"}
              </button>
              {feedback ? <p className="self-center text-sm font-semibold text-[#8dd0ff]">{feedback}</p> : null}
            </div>
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/profile" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to profile
          </Link>
          <Link href="/profile/inventory" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            View inventory
          </Link>
        </div>
      </main>
    </div>
  );
}
