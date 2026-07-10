type FxPayload = {
  rates: Record<string, number>;
};

const FALLBACK_USD_TO_BRL = 5.5;
const FALLBACK_USD_TO_EUR = 0.92;

export async function GET() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return Response.json({
        usdToBrl: FALLBACK_USD_TO_BRL,
        usdToEur: FALLBACK_USD_TO_EUR,
        source: "fallback",
      });
    }

    const payload = (await response.json()) as FxPayload;
    const usdToBrl = payload?.rates?.BRL;
    const usdToEur = payload?.rates?.EUR;

    if (
      typeof usdToBrl !== "number" ||
      !Number.isFinite(usdToBrl) ||
      usdToBrl <= 0 ||
      typeof usdToEur !== "number" ||
      !Number.isFinite(usdToEur) ||
      usdToEur <= 0
    ) {
      return Response.json({
        usdToBrl: FALLBACK_USD_TO_BRL,
        usdToEur: FALLBACK_USD_TO_EUR,
        source: "fallback",
      });
    }

    return Response.json({
      usdToBrl,
      usdToEur,
      source: "open.er-api",
    });
  } catch {
    return Response.json({
      usdToBrl: FALLBACK_USD_TO_BRL,
      usdToEur: FALLBACK_USD_TO_EUR,
      source: "fallback",
    });
  }
}
