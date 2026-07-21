import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldPath, FieldValue, getFirestore } from "firebase-admin/firestore";

const ADMIN_SEARCH_INDEX_STATUS_DOC_ID = "admin-search-index-status";
const SEARCH_TOKEN_PATTERN = /[a-z0-9@._:-]+/g;
const MAX_PREFIX_LENGTH = 40;
const MAX_PREFIXES = 160;
const ROOT_DIR = resolve(new URL("..", import.meta.url).pathname);

function loadEnvFile(fileName) {
  const filePath = resolve(ROOT_DIR, fileName);
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) {
    return null;
  }

  return raw.trim().replace(/^['"]|['"]$/g, "").replace(/\\n/g, "\n").replace(/\r/g, "");
}

function getDb() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = getPrivateKey();

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Firebase Admin SDK is not configured for reindexing.");
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  return getFirestore();
}

function normalizeAdminSearchValue(value) {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildAdminSearchText(values) {
  return Array.from(new Set(values.map((value) => normalizeAdminSearchValue(value)).filter(Boolean))).join(" ");
}

function buildAdminSearchPrefixes(values) {
  const prefixes = new Set();

  for (const rawValue of values) {
    const normalized = normalizeAdminSearchValue(rawValue);
    if (!normalized) {
      continue;
    }

    const tokens = Array.from(new Set([normalized, ...(normalized.match(SEARCH_TOKEN_PATTERN) ?? [])]));
    for (const token of tokens) {
      for (let index = 1; index <= Math.min(token.length, MAX_PREFIX_LENGTH); index += 1) {
        prefixes.add(token.slice(0, index));
        if (prefixes.size >= MAX_PREFIXES) {
          return Array.from(prefixes);
        }
      }
    }
  }

  return Array.from(prefixes);
}

function buildUserAdminSearchIndex({ uid, username, email, agentReferralCode }) {
  const values = [uid, username ?? "", email ?? "", agentReferralCode ?? ""];
  return {
    adminSearchText: buildAdminSearchText(values),
    adminSearchPrefixes: buildAdminSearchPrefixes(values),
  };
}

function buildGiftcardClaimAdminSearchIndex({ claimId, uid, username, accountEmail, redeemEmail, giftCardTitle, country }) {
  const values = [claimId, uid ?? "", username ?? "", accountEmail ?? "", redeemEmail ?? "", giftCardTitle ?? "", country ?? ""];
  return {
    adminSearchText: buildAdminSearchText(values),
    adminSearchPrefixes: buildAdminSearchPrefixes(values),
  };
}

async function reindexCollection(collectionName, limit, buildPayload) {
  const db = getDb();
  let cursor = null;
  let totalUpdated = 0;

  while (true) {
    let query = db.collection(collectionName).orderBy(FieldPath.documentId()).limit(limit);
    if (cursor) {
      const cursorSnapshot = await db.collection(collectionName).doc(cursor).get();
      if (cursorSnapshot.exists) {
        query = query.startAfter(cursorSnapshot);
      }
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    for (const docRow of snapshot.docs) {
      batch.set(docRow.ref, buildPayload(docRow), { merge: true });
    }
    await batch.commit();

    totalUpdated += snapshot.docs.length;
    cursor = snapshot.docs[snapshot.docs.length - 1]?.id ?? null;

    if (snapshot.docs.length < limit) {
      break;
    }
  }

  return totalUpdated;
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const db = getDb();
  const limit = 200;
  const usersUpdated = await reindexCollection("users", limit, (docRow) => {
    const data = docRow.data();
    return buildUserAdminSearchIndex({
      uid: docRow.id,
      username: typeof data.username === "string" ? data.username : null,
      email: typeof data.email === "string" ? data.email : null,
      agentReferralCode: typeof data.agentReferralCode === "string" ? data.agentReferralCode : null,
    });
  });

  const claimsUpdated = await reindexCollection("giftcard-claims", limit, (docRow) => {
    const data = docRow.data();
    return buildGiftcardClaimAdminSearchIndex({
      claimId: docRow.id,
      uid: typeof data.uid === "string" ? data.uid : null,
      username: typeof data.username === "string" ? data.username : null,
      accountEmail: typeof data.accountEmail === "string" ? data.accountEmail : null,
      redeemEmail: typeof data.redeemEmail === "string" ? data.redeemEmail : null,
      giftCardTitle: typeof data.giftCardTitle === "string" ? data.giftCardTitle : null,
      country: typeof data.country === "string" ? data.country : null,
    });
  });

  await db.collection("app-config").doc(ADMIN_SEARCH_INDEX_STATUS_DOC_ID).set(
    {
      usersComplete: true,
      claimsComplete: true,
      usersUpdatedAt: FieldValue.serverTimestamp(),
      claimsUpdatedAt: FieldValue.serverTimestamp(),
      lastExecutedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(`Admin search reindex completed. users=${usersUpdated} claims=${claimsUpdated}`);
}

main().catch((error) => {
  console.error("Admin search reindex failed:", error);
  process.exitCode = 1;
});