import {
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { defaultHotGameIds } from "../app/data/games";
import { auth, db, firebaseEnabled } from "./firebase";

const hotGamesRef =
  db && firebaseEnabled ? doc(db, "app-config", "homepage") : null;

type HotGamesPayload = {
  hotGameIds?: unknown;
};

export function subscribeToHotGames(
  onChange: (hotGameIds: string[]) => void
): Unsubscribe {
  if (!hotGamesRef) {
    onChange(defaultHotGameIds);
    return () => undefined;
  }

  return onSnapshot(
    hotGamesRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(defaultHotGameIds);
        return;
      }

      const data = snapshot.data() as HotGamesPayload;
      const hotGameIds = Array.isArray(data.hotGameIds)
        ? data.hotGameIds.filter(
            (item): item is string => typeof item === "string"
          )
        : defaultHotGameIds;

      onChange(hotGameIds);
    },
    () => {
      onChange(defaultHotGameIds);
    }
  );
}

export async function saveHotGames(hotGameIds: string[]) {
  if (!hotGamesRef) {
    throw new Error("Firebase not configured.");
  }

  if (!auth?.currentUser) {
    throw new Error("You must be logged in to save highlighted games.");
  }

  await auth.currentUser.getIdToken();

  await setDoc(
    hotGamesRef,
    {
      hotGameIds,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
