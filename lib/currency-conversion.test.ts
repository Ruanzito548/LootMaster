import { describe, expect, it } from "vitest";

import { convertCentsToUsdCents, DEFAULT_USD_RATES } from "./currency-conversion";

describe("currency conversion", () => {
  it("converts BRL order values to USD cents", () => {
    expect(convertCentsToUsdCents(21484, "BRL", { ...DEFAULT_USD_RATES, BRL: 5.5 })).toBe(3906);
  });

  it("keeps USD order values unchanged", () => {
    expect(convertCentsToUsdCents(10400, "USD")).toBe(10400);
  });
});
