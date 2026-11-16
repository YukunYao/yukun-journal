import Stripe from 'stripe'
import { adminClient, authenticatedUser, json } from '../server/shared'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
    if (process.env.PAYMENTS_APPROVED !== 'true') return json({ error: 'Purchasing is not open yet.' }, 503)
    const user = await authenticatedUser(request)
    if (!user) return json({ error: 'Sign in to make a purchase.' }, 401)
    const price = process.env.STRIPE_COMPLETE_COLLECTION_PRICE_ID
    const origin = process.env.SITE_URL
    if (!process.env.STRIPE_SECRET_KEY || !price || !origin) return json({ error: 'Checkout is not configured.' }, 503)
    const db = adminClient()
    const existing = await db.from('purchase_entitlements').select('user_id').eq('user_id', user.id).maybeSingle()
    if (existing.error) return json({ error: 'Could not check your purchase status.' }, 503)
    if (existing.data) return json({ error: 'Complete Collection is already yours.' }, 409)
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      const configuredPrice = await stripe.prices.retrieve(price)
      if (!configuredPrice.active || configuredPrice.type !== 'one_time' || configuredPrice.currency !== 'usd' || configuredPrice.unit_amount === null) return json({ error: 'The one-time USD price is not ready.' }, 503)
      const session = await stripe.checkout.sessions.create({
        mode: 'payment', line_items: [{ price, quantity: 1 }],
        client_reference_id: user.id, customer_email: user.email,
        metadata: { user_id: user.id, product: 'complete_collection' },
        success_url: `${origin}/account?checkout=returned`, cancel_url: `${origin}/pricing`,
      })
      return json({ url: session.url })
    } catch { return json({ error: 'Checkout is temporarily unavailable.' }, 502) }
  },
}
