const SEARCH_TOKEN_PATTERN = /[a-z0-9@._:-]+/g;
const MAX_PREFIX_LENGTH = 40;
const MAX_PREFIXES = 160;

export const ADMIN_SEARCH_INDEX_STATUS_DOC_ID = "admin-search-index-status";

function stripDiacritics(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeAdminSearchValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return stripDiacritics(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function extractSearchTokens(value: string): string[] {
  const normalized = normalizeAdminSearchValue(value);
  if (!normalized) {
    return [];
  }

  const matches = normalized.match(SEARCH_TOKEN_PATTERN) ?? [];
  return Array.from(new Set([normalized, ...matches]));
}

export function buildAdminSearchPrefixes(values: string[]): string[] {
  const prefixes = new Set<string>();

  for (const value of values) {
    for (const token of extractSearchTokens(value)) {
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

export function buildAdminSearchText(values: string[]): string {
  return Array.from(new Set(values.map((value) => normalizeAdminSearchValue(value)).filter(Boolean))).join(" ");
}

export function matchesAdminSearchText(values: string[], query: string): boolean {
  const normalizedQuery = normalizeAdminSearchValue(query);
  if (!normalizedQuery) {
    return true;
  }

  return buildAdminSearchText(values).includes(normalizedQuery);
}

export function buildUserAdminSearchIndex(input: {
  uid: string;
  username?: string | null;
  email?: string | null;
  agentReferralCode?: string | null;
}) {
  const values = [input.uid, input.username ?? "", input.email ?? "", input.agentReferralCode ?? ""];
  return {
    adminSearchText: buildAdminSearchText(values),
    adminSearchPrefixes: buildAdminSearchPrefixes(values),
  };
}

export function buildGiftcardClaimAdminSearchIndex(input: {
  claimId: string;
  uid?: string | null;
  username?: string | null;
  accountEmail?: string | null;
  redeemEmail?: string | null;
  giftCardTitle?: string | null;
  country?: string | null;
}) {
  const values = [
    input.claimId,
    input.uid ?? "",
    input.username ?? "",
    input.accountEmail ?? "",
    input.redeemEmail ?? "",
    input.giftCardTitle ?? "",
    input.country ?? "",
  ];

  return {
    adminSearchText: buildAdminSearchText(values),
    adminSearchPrefixes: buildAdminSearchPrefixes(values),
  };
}