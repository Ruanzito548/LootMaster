import { describe, expect, it } from "vitest";

import { normalizeGoldPriceInput, parseGoldPriceInput } from "./gold-config-admin-utils";

describe("gold price input helpers", () => {
  it("normalizes comma decimals to dot decimals", () => {
    expect(normalizeGoldPriceInput("0,042")).toBe("0.042");
    expect(normalizeGoldPriceInput("20,50")).toBe("20.50");
  });

  it("parses decimal values written with dot or comma", () => {
    expect(parseGoldPriceInput("0.042")).toBe(0.042);
    expect(parseGoldPriceInput("0,042")).toBe(0.042);
    expect(parseGoldPriceInput("20.50")).toBe(20.5);
  });

  it("keeps incomplete decimals editable", () => {
    expect(normalizeGoldPriceInput("0.")).toBe("0.");
    expect(parseGoldPriceInput("0.")).toBeNull();
  });
});
