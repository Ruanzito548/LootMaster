import Stripe from "stripe";

type CheckoutBody = {
  gameTitle: string;
  categoryTitle: string;
  goldAmount: number;
  pricePerThousand: number;
  paymentMethod: "pix" | "card" | "balance";
  nickname: string;
  server: string;
  faction: string;
  deliveryMethod: string;
  email: string;
};

function computeFinalAmount(price: number, paymentMethod: string): number {
  if (paymentMethod === "pix") return Math.round(price * 0.95 * 100);
  if (paymentMethod === "card") return Math.round(price * 1.04 * 100);
  return Math.round(price * 100);
}

export async function POST(request: Request): Promise<Response> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return Response.json({ error: "Payment gateway not configured." }, { status: 503 });
  }

  const stripe = new Stripe(secretKey);

  let body: CheckoutBody;

  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    gameTitle,
    categoryTitle,
    goldAmount,
    pricePerThousand,
    paymentMethod,
    nickname,
    server,
    faction,
    deliveryMethod,
    email,
  } = body;

  if (!gameTitle || !goldAmount || !pricePerThousand || !email) {
    return Response.json({ error: "Missing required fields." }, { status: 422 });
  }

  const basePrice = (goldAmount / 1000) * pricePerThousand;
  const unitAmount = computeFinalAmount(basePrice, paymentMethod);

  if (unitAmount <= 0) {
    return Response.json({ error: "Invalid price." }, { status: 422 });
  }

  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  const paymentMethodTypes = (
    paymentMethod === "pix" ? ["pix"] : ["card"]
  ) as Stripe.Checkout.SessionCreateParams["payment_method_types"];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      customer_email: email,
      metadata: {
        gameTitle,
        categoryTitle,
        goldAmount: String(goldAmount),
        server,
        faction,
        deliveryMethod,
        nickname,
        paymentMethod,
      },
      line_items: [
        {
          price_data: {
            currency: "brl",
            unit_amount: unitAmount,
            product_data: {
              name: `${goldAmount.toLocaleString("pt-BR")} gold — ${gameTitle} / ${categoryTitle}`,
              description: [
                server && `Server: ${server}`,
                faction && `Faction: ${faction}`,
                `Delivery: ${deliveryMethod}`,
                `Character: ${nickname}`,
                paymentMethod === "pix" ? "Pix discount applied (5%)" : null,
                paymentMethod === "card" ? "Card gateway fee applied (4%)" : null,
              ]
                .filter(Boolean)
                .join(" | "),
              metadata: {
                gameTitle,
                categoryTitle,
                goldAmount: String(goldAmount),
                server,
                faction,
                deliveryMethod,
                nickname,
                paymentMethod,
              },
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe session creation failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
