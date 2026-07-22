import { describe, expect, it } from "vitest";

import { getUsdToCurrencyRate } from "./checkout-pricing";

describe("checkout pricing conversion", () => {
  const rates = {
    BRL: 1,
    USD: 0.18,
    EUR: 0.16,
    GBP: 0.14,
  };

  it("keeps USD prices unchanged", () => {
    expect(getUsdToCurrencyRate("USD", rates)).toBe(1);
  });

  it("converts USD prices to BRL using the target-vs-source rate ratio", () => {
    expect(getUsdToCurrencyRate("BRL", rates)).toBeCloseTo(5.5555555556, 10);
  });

  it("converts USD prices to EUR using the target-vs-source rate ratio", () => {
    expect(getUsdToCurrencyRate("EUR", rates)).toBeCloseTo(0.8888888889, 10);
  });
});
