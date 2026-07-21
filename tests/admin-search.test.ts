import { describe, expect, it } from "vitest";

import {
  buildGiftcardClaimAdminSearchIndex,
  buildUserAdminSearchIndex,
  matchesAdminSearchText,
  normalizeAdminSearchValue,
} from "../lib/admin-search";

describe("admin-search", () => {
  it("normalizes accents and casing", () => {
    expect(normalizeAdminSearchValue("  João@Email.COM  ")).toBe("joao@email.com");
  });

  it("creates prefix index entries for user search", () => {
    const index = buildUserAdminSearchIndex({
      uid: "discord:123",
      username: "Leandro",
      email: "leo@example.com",
      agentReferralCode: "LDR01",
    });

    expect(index.adminSearchPrefixes).toContain("lea");
    expect(index.adminSearchPrefixes).toContain("leo@");
    expect(index.adminSearchPrefixes).toContain("ldr");
  });

  it("matches free text against claims composite fields", () => {
    const index = buildGiftcardClaimAdminSearchIndex({
      claimId: "claim_1",
      uid: "discord:abc",
      username: "Knight User",
      accountEmail: "buyer@example.com",
      redeemEmail: "redeem@example.com",
      giftCardTitle: "Steam Gift Card",
      country: "BR",
    });

    expect(matchesAdminSearchText([index.adminSearchText], "steam gift")).toBe(true);
    expect(matchesAdminSearchText([index.adminSearchText], "redeem@example")).toBe(true);
    expect(matchesAdminSearchText([index.adminSearchText], "xbox")).toBe(false);
  });
});