/**
 * Stripe webhook: Dashboard → Developers → Webhooks → Endpoint URL:
 * https://safewalk-2.vercel.app/api/stripe-webhook
 *
 * Переменные окружения (Vercel → Settings → Environment Variables):
 * - STRIPE_SECRET_KEY — секретный ключ (sk_test_… / sk_live_…)
 * - STRIPE_WEBHOOK_SECRET — подпись эндпоинта из Stripe (whsec_…)
 */
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !webhookSecret) {
    return new Response("Stripe webhook env not set (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)", {
      status: 500,
    });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const stripe = new Stripe(key);
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // Здесь можно выдать/снять премиум в БД по event.data.object
      break;
    default:
      break;
  }

  return Response.json({ received: true });
}
