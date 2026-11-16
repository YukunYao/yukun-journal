import Stripe from 'stripe'
import { json } from '../server/shared'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405)
    if (process.env.PAYMENTS_APPROVED !== 'true' || !process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_COMPLETE_COLLECTION_PRICE_ID) return json({ available: false })
    try {
      const price = await new Stripe(process.env.STRIPE_SECRET_KEY).prices.retrieve(process.env.STRIPE_COMPLETE_COLLECTION_PRICE_ID)
      if (!price.active || price.type !== 'one_time' || price.currency !== 'usd' || price.unit_amount === null) return json({ available: false })
      return json({ available: true, amount: price.unit_amount, currency: price.currency })
    } catch { return json({ available: false }) }
  },
}
