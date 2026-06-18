"use client";

import { useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";

async function upsertSessionCookie(idToken: string) {
  await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    cache: "no-store",
  });
}

async function clearSessionCookie() {
  await fetch("/api/auth/session", {
    method: "DELETE",
    cache: "no-store",
  });
}

export function AuthSessionSync() {
  useEffect(() => {
    if (!auth) {
      return;
    }

    return onIdTokenChanged(auth, (user) => {
      void (async () => {
        try {
          if (!user) {
            await clearSessionCookie();
            return;
          }

          const idToken = await user.getIdToken();
          await upsertSessionCookie(idToken);
        } catch {
          // Best-effort sync. Client auth remains functional even if cookie sync fails.
        }
      })();
    });
  }, []);

  return null;
}
