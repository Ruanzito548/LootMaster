type WalletBackendOrderCompletedInput = {
  orderId: string;
  threadId: string;
  completedByUid?: string;
  idempotencyKey?: string;
};

type WalletBackendPaidOrderInput = {
  orderId: string;
  customerId?: string | null;
  totalAmount: number;
  supplierPayout: number;
  currency: string;
  metadata?: Record<string, unknown>;
};

type WalletBackendAssignedSupplierInput = {
  orderId: string;
  supplierDiscordId: string;
  supplierDiscordUsername?: string | null;
  assignedByUid?: string | null;
};

type WalletBackendSupplierApplicationInput = {
  orderId: string;
  discordId: string;
  discordUsername: string;
  discordGlobalName?: string | null;
};

type WalletBackendLinkConsumeInput = {
  token: string;
  siteUserId: string;
  discordId: string;
  discordUsername: string;
  email?: string | null;
};

type WalletBackendSupplierApplicationResult = {
  configured: boolean;
  linkRequired: boolean;
  registrationUrl: string | null;
  dmQueued: boolean;
};

function getWalletBackendConfig() {
  const baseUrl = process.env.WALLET_BACKEND_URL?.trim();
  const token = process.env.WALLET_BACKEND_TOKEN?.trim();

  if (!baseUrl) {
    return null;
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    token,
  };
}

async function walletBackendRequest<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T | null> {
  const config = getWalletBackendConfig();

  if (!config) {
    return null;
  }

  const buildRequestInit = () => ({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });

  const response = await fetch(`${config.baseUrl}${path}`, buildRequestInit());

  if (!response.ok) {
    const payload = (await response.text()) || `Wallet backend request failed for ${path}.`;
    throw new Error(payload);
  }

  return (await response.json()) as T;
}

export async function forwardOrderCompletionToWalletBackend(input: WalletBackendOrderCompletedInput) {
  const response = await walletBackendRequest<{ ok: boolean }>(
    "/internal/orders/completed",
    {
      orderId: input.orderId,
      threadId: input.threadId,
      completedByUid: input.completedByUid ?? null,
    },
    input.idempotencyKey,
  );

  return {
    forwarded: Boolean(response),
  };
}

export async function syncPaidOrderToWalletBackend(input: WalletBackendPaidOrderInput) {
  const response = await walletBackendRequest<{ ok: boolean }>("/internal/orders/paid", input);

  return {
    forwarded: Boolean(response),
  };
}

export async function assignSupplierToOrderInWalletBackend(input: WalletBackendAssignedSupplierInput) {
  try {
    const response = await walletBackendRequest<{ ok: boolean }>("/internal/orders/assigned-supplier", input);

    return {
      forwarded: Boolean(response),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isLegacyRouteNotFound =
      message.includes("Route POST:/internal/orders/assigned-supplier not found") ||
      message.includes("/internal/orders/assigned-supplier") && message.includes("Not Found");

    if (!isLegacyRouteNotFound) {
      throw error;
    }

    const response = await walletBackendRequest<{ ok: boolean }>("/internal/orders/assign-supplier", input);

    return {
      forwarded: Boolean(response),
    };
  }
}

export async function registerSupplierApplicationWithWalletBackend(
  input: WalletBackendSupplierApplicationInput,
): Promise<WalletBackendSupplierApplicationResult> {
  const response = await walletBackendRequest<{
    linkRequired?: boolean;
    registrationUrl?: string | null;
    dmQueued?: boolean;
  }>("/internal/discord/applications", input);

  if (!response) {
    return {
      configured: false,
      linkRequired: false,
      registrationUrl: null,
      dmQueued: false,
    };
  }

  return {
    configured: true,
    linkRequired: Boolean(response.linkRequired),
    registrationUrl: response.registrationUrl ?? null,
    dmQueued: Boolean(response.dmQueued),
  };
}

export async function consumeDiscordLinkTokenWithWalletBackend(input: WalletBackendLinkConsumeInput) {
  const response = await walletBackendRequest<{ linked?: boolean }>("/internal/discord-link/consume", {
    token: input.token,
    siteUserId: input.siteUserId,
    discordId: input.discordId,
    discordUsername: input.discordUsername,
    email: input.email ?? null,
  });

  return {
    forwarded: Boolean(response),
    linked: Boolean(response?.linked),
  };
}