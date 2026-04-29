"use client";

import { useCallback, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db, firebaseEnabled } from "../../lib/firebase";
import { fetchUserProfile, ensureUserProfileDoc, UserProfile } from "../../lib/profile-data";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

type SessionState = {
  status: SessionStatus;
  user: User | null;
  profile: UserProfile | null;
  error: string | null;
};

type EditableProfileFields = Partial<
  Pick<UserProfile, "username" | "photoURL" | "coverURL" | "lootCoins" | "tickets" | "keys" | "inventory" | "transactions">
>;

const initialState: SessionState = {
  status: !firebaseEnabled || !auth ? "unauthenticated" : "loading",
  user: null,
  profile: null,
  error: !firebaseEnabled || !auth ? "Firebase not configured." : null,
};

export function useProfileSession() {
  const [state, setState] = useState<SessionState>(initialState);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!nextUser) {
        setState({ status: "unauthenticated", user: null, profile: null, error: null });
        return;
      }

      setState((current) => ({ ...current, status: "loading", user: nextUser, error: null }));

      void (async () => {
        try {
          await ensureUserProfileDoc(nextUser);
          const profile = await fetchUserProfile(nextUser.uid);

          setState({
            status: "authenticated",
            user: nextUser,
            profile,
            error: null,
          });
        } catch (error) {
          setState({
            status: "authenticated",
            user: nextUser,
            profile: null,
            error: error instanceof Error ? error.message : "Could not load your profile.",
          });
        }
      })();
    });

    return unsubscribe;
  }, [reloadToken]);

  const saveProfile = useCallback(
    async (changes: EditableProfileFields) => {
      if (!db || !state.user) {
        return false;
      }

      const payload: Record<string, unknown> = {
        ...changes,
        updatedAt: serverTimestamp(),
      };

      if (typeof changes.photoURL === "string") {
        payload.photoURL = changes.photoURL.trim();
      }

      if (typeof changes.coverURL === "string") {
        payload.coverURL = changes.coverURL.trim();
      }

      if (typeof changes.username === "string") {
        payload.username = changes.username.trim();
      }

      try {
        await setDoc(doc(db, "users", state.user.uid), payload, { merge: true });

        setState((current) => {
          if (!current.profile) {
            return current;
          }

          return {
            ...current,
            profile: {
              ...current.profile,
              ...changes,
              username: typeof changes.username === "string" ? changes.username.trim() : current.profile.username,
              photoURL: typeof changes.photoURL === "string" ? changes.photoURL.trim() : current.profile.photoURL,
              coverURL: typeof changes.coverURL === "string" ? changes.coverURL.trim() : current.profile.coverURL,
            },
          };
        });

        return true;
      } catch {
        return false;
      }
    },
    [state.user],
  );

  const signOutUser = useCallback(async () => {
    if (!auth) {
      return false;
    }

    try {
      await signOut(auth);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    ...state,
    reload,
    saveProfile,
    signOutUser,
  };
}
