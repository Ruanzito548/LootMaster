import {
  collection,
  doc,
  onSnapshot,
  query,
  type Unsubscribe,
  where,
} from "firebase/firestore";

import { db, firebaseEnabled } from "./firebase";

export type OrderApplication = {
  applicationId: string;
  orderId: string;
  uid: string;
  supplierName: string;
  supplierEmail: string;
  supplierDiscordHandle: string;
  supplierDiscordUserId: string;
  gameTitle: string;
  categoryTitle: string;
  goldAmount: number;
  server: string;
  faction: string;
  nickname: string;
  finalAmountCents: number;
  currency: string;
  status: string;
};

export type OrderDispatch = {
  orderId: string;
  status: string;
  selectedApplicationId: string;
  selectedSupplierName: string;
  selectedSupplierEmail: string;
  selectedSupplierDiscordHandle: string;
  selectedSupplierDiscordUserId: string;
  threadId: string;
  threadUrl: string;
};

const applicationsCol = db && firebaseEnabled ? collection(db, "order-applications") : null;

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseOrderApplication(id: string, data: Record<string, unknown>): OrderApplication {
  return {
    applicationId: getString(data.applicationId, id),
    orderId: getString(data.orderId),
    uid: getString(data.uid),
    supplierName: getString(data.supplierName, "Supplier"),
    supplierEmail: getString(data.supplierEmail),
    supplierDiscordHandle: getString(data.supplierDiscordHandle),
    supplierDiscordUserId: getString(data.supplierDiscordUserId),
    gameTitle: getString(data.gameTitle),
    categoryTitle: getString(data.categoryTitle),
    goldAmount: getNumber(data.goldAmount),
    server: getString(data.server, "-"),
    faction: getString(data.faction, "-"),
    nickname: getString(data.nickname, "-"),
    finalAmountCents: getNumber(data.finalAmountCents),
    currency: getString(data.currency, "brl"),
    status: getString(data.status, "applied"),
  };
}

export function subscribeToOrderApplications(
  orderId: string,
  onChange: (applications: OrderApplication[]) => void,
): Unsubscribe {
  if (!applicationsCol || !orderId) {
    onChange([]);
    return () => undefined;
  }

  const q = query(applicationsCol, where("orderId", "==", orderId));

  return onSnapshot(
    q,
    (snapshot) => {
      const applications = snapshot.docs.map((row) =>
        parseOrderApplication(row.id, row.data() as Record<string, unknown>),
      );
      onChange(applications);
    },
    () => onChange([]),
  );
}

export function subscribeToOrderDispatch(
  orderId: string,
  onChange: (dispatch: OrderDispatch | null) => void,
): Unsubscribe {
  if (!db || !firebaseEnabled || !orderId) {
    onChange(null);
    return () => undefined;
  }

  return onSnapshot(
    doc(db, "order-dispatches", orderId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }

      const data = snapshot.data() as Record<string, unknown>;
      onChange({
        orderId,
        status: getString(data.status, "assigned"),
        selectedApplicationId: getString(data.selectedApplicationId),
        selectedSupplierName: getString(data.selectedSupplierName),
        selectedSupplierEmail: getString(data.selectedSupplierEmail),
        selectedSupplierDiscordHandle: getString(data.selectedSupplierDiscordHandle),
        selectedSupplierDiscordUserId: getString(data.selectedSupplierDiscordUserId),
        threadId: getString(data.threadId),
        threadUrl: getString(data.threadUrl),
      });
    },
    () => onChange(null),
  );
}