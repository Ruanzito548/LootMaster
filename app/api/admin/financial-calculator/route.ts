import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import {
  FINANCIAL_CALCULATOR_CONFIG_DOC_ID,
  buildDefaultFinancialCalculatorConfig,
  sanitizeFinancialCalculatorConfig,
} from "@/lib/financial-calculator-config";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  SITE_FEE_SETTINGS_DOC_ID,
  buildDefaultSiteFeeSettings,
  sanitizeSiteFeeSettings,
} from "@/lib/site-fee-settings";

type PutBody = {
  config?: unknown;
};

type FinancialCalculatorHistory = {
  previousConfig: unknown | null;
  updatedAt: string | null;
  updatedBy: string | null;
  updatedByLabel: string | null;
  previousUpdatedAt: string | null;
  previousUpdatedBy: string | null;
  previousUpdatedByLabel: string | null;
};

function serializeTimestamp(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as { toDate?: () => Date };
  if (typeof parsed.toDate !== "function") {
    return null;
  }

  const date = parsed.toDate();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function getAdminLabel(data: Record<string, unknown> | null, fallbackUid: string) {
  const label =
    typeof data?.displayName === "string"
      ? data.displayName
      : typeof data?.username === "string"
        ? data.username
        : typeof data?.name === "string"
          ? data.name
          : typeof data?.email === "string"
            ? data.email
            : fallbackUid;

  return label.trim() || fallbackUid;
}

function buildHistory(snapshotData: Record<string, unknown> | null): FinancialCalculatorHistory {
  const previousConfig = snapshotData?.previousConfig ? sanitizeFinancialCalculatorConfig(snapshotData.previousConfig) : null;

  return {
    previousConfig,
    updatedAt: serializeTimestamp(snapshotData?.updatedAt) ?? null,
    updatedBy: typeof snapshotData?.updatedBy === "string" ? snapshotData.updatedBy : null,
    updatedByLabel: typeof snapshotData?.updatedByLabel === "string" ? snapshotData.updatedByLabel : null,
    previousUpdatedAt: serializeTimestamp(snapshotData?.previousUpdatedAt) ?? null,
    previousUpdatedBy: typeof snapshotData?.previousUpdatedBy === "string" ? snapshotData.previousUpdatedBy : null,
    previousUpdatedByLabel:
      typeof snapshotData?.previousUpdatedByLabel === "string" ? snapshotData.previousUpdatedByLabel : null,
  };
}

function statusFromErrorMessage(message: string): number {
  if (message.includes("authorization") || message.includes("token") || message.includes("admin")) {
    return 401;
  }

  if (message.includes("payload") || message.includes("config")) {
    return 422;
  }

  return 500;
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedAdminRequest(request);

    const adminDb = getAdminDb();
    const calculatorSnapshot = await adminDb.collection("app-config").doc(FINANCIAL_CALCULATOR_CONFIG_DOC_ID).get();
    const calculatorSnapshotData = calculatorSnapshot.exists ? (calculatorSnapshot.data() as Record<string, unknown>) : null;
    const siteFeeSnapshot = await adminDb.collection("app-config").doc(SITE_FEE_SETTINGS_DOC_ID).get();

    const calculatorConfig = calculatorSnapshot.exists
      ? sanitizeFinancialCalculatorConfig(calculatorSnapshot.data())
      : buildDefaultFinancialCalculatorConfig();
    const siteFeeSettings = siteFeeSnapshot.exists
      ? sanitizeSiteFeeSettings(siteFeeSnapshot.data())
      : buildDefaultSiteFeeSettings();

    const config = {
      ...calculatorConfig,
      supplierPercentage: siteFeeSettings.supplierDefaultPercent,
      cardGatewayFeePercent: siteFeeSettings.cardGatewayFeePercent,
      cashbackPercent: siteFeeSettings.cashbackPercent,
      operationalReservePercent: siteFeeSettings.operationalReservePercent,
    };

    const history = buildHistory(calculatorSnapshotData);

    return Response.json({ ok: true, config, history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load financial calculator config.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}

export async function PUT(request: Request): Promise<Response> {
  let decodedToken: Awaited<ReturnType<typeof requireAuthenticatedAdminRequest>>;
  let body: PutBody;

  try {
    decodedToken = await requireAuthenticatedAdminRequest(request);
    body = (await request.json()) as PutBody;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }

  if (!body || typeof body !== "object" || body.config === undefined) {
    return Response.json({ error: "Invalid payload config." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const sanitized = sanitizeFinancialCalculatorConfig(body.config);
    const calculatorSnapshot = await adminDb.collection("app-config").doc(FINANCIAL_CALCULATOR_CONFIG_DOC_ID).get();
    const snapshotData = calculatorSnapshot.exists ? (calculatorSnapshot.data() as Record<string, unknown>) : null;
    const currentConfig = calculatorSnapshot.exists ? sanitizeFinancialCalculatorConfig(calculatorSnapshot.data()) : null;
    const siteFeeSnapshot = await adminDb.collection("app-config").doc(SITE_FEE_SETTINGS_DOC_ID).get();
    const currentSiteFee = siteFeeSnapshot.exists
      ? sanitizeSiteFeeSettings(siteFeeSnapshot.data())
      : buildDefaultSiteFeeSettings();
    const adminUserDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    const adminUserData = adminUserDoc.exists ? (adminUserDoc.data() as Record<string, unknown>) : null;
    const adminLabel = getAdminLabel(adminUserData, decodedToken.uid);

    const syncedSiteFee = sanitizeSiteFeeSettings({
      ...currentSiteFee,
      supplierDefaultPercent: sanitized.supplierPercentage,
      cardGatewayFeePercent: sanitized.cardGatewayFeePercent,
      cashbackPercent: sanitized.cashbackPercent,
      operationalReservePercent: sanitized.operationalReservePercent,
      updatedAtMs: Date.now(),
    });

    await adminDb
      .collection("app-config")
      .doc(SITE_FEE_SETTINGS_DOC_ID)
      .set(
        {
          ...syncedSiteFee,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: decodedToken.uid,
          updatedByLabel: adminLabel,
        },
        { merge: true },
      );

    await adminDb
      .collection("app-config")
      .doc(FINANCIAL_CALCULATOR_CONFIG_DOC_ID)
      .set(
        {
          ...sanitized,
          updatedAtMs: Date.now(),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: decodedToken.uid,
          updatedByLabel: adminLabel,
          previousConfig: currentConfig,
          previousUpdatedAt: snapshotData?.updatedAt ?? null,
          previousUpdatedBy: typeof snapshotData?.updatedBy === "string" ? snapshotData.updatedBy : null,
          previousUpdatedByLabel: typeof snapshotData?.updatedByLabel === "string" ? snapshotData.updatedByLabel : null,
        },
        { merge: true },
      );

    return Response.json({
      ok: true,
      config: {
        ...sanitized,
        supplierPercentage: syncedSiteFee.supplierDefaultPercent,
        cardGatewayFeePercent: syncedSiteFee.cardGatewayFeePercent,
        cashbackPercent: syncedSiteFee.cashbackPercent,
        operationalReservePercent: syncedSiteFee.operationalReservePercent,
      },
      history: {
        previousConfig: currentConfig,
        updatedAt: new Date().toISOString(),
        updatedBy: decodedToken.uid,
        updatedByLabel: adminLabel,
        previousUpdatedAt: serializeTimestamp(snapshotData?.updatedAt) ?? null,
        previousUpdatedBy: typeof snapshotData?.updatedBy === "string" ? snapshotData.updatedBy : null,
        previousUpdatedByLabel: typeof snapshotData?.updatedByLabel === "string" ? snapshotData.updatedByLabel : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save financial calculator config.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}