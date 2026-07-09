type FxPayload = {
  rates: Record<string, number>;
};

export async function GET() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return Response.json({ usdToBrl: 5.5, source: "fallback" });
    }

    const payload = (await response.json()) as FxPayload;
    const usdToBrl = payload?.rates?.BRL;

    if (typeof usdToBrl !== "number" || !Number.isFinite(usdToBrl) || usdToBrl <= 0) {
      return Response.json({ usdToBrl: 5.5, source: "fallback" });
    }

    return Response.json({ usdToBrl, source: "open.er-api" });
  } catch {
    return Response.json({ usdToBrl: 5.5, source: "fallback" });
  }
}