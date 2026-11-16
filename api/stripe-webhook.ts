import Stripe from 'stripe'
import { adminClient, json } from '../server/shared'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
    const secret = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!secret || !webhookSecret) return json({ error: 'Webhook is not configured.' }, 503)
    const signature = request.headers.get('stripe-signature')
    if (!signature) return json({ error: 'Missing signature.' }, 400)
    const stripe = new Stripe(secret)
    let event: Stripe.Event
    try { event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret) }
    catch { return json({ error: 'Invalid signature.' }, 400) }
    if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') return json({ received: true })
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id
    if (session.mode !== 'payment' || session.payment_status !== 'paid' || session.metadata?.product !== 'complete_collection' || !userId || userId !== session.client_reference_id) return json({ received: true })
    const result = await adminClient().from('purchase_entitlements').upsert({ user_id: userId, stripe_session_id: session.id }, { onConflict: 'user_id', ignoreDuplicates: true })
    if (result.error) return json({ error: 'Could not grant purchase. Stripe will retry.' }, 500)
    return json({ received: true })
  },
}
