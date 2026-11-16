import { afterEach, describe, expect, it } from 'vitest'
import aiPlan from '../api/ai-plan'
import createCheckout from '../api/create-checkout'
import stripeWebhook from '../api/stripe-webhook'

const previousAiGate = process.env.AI_CLINICAL_APPROVED
const previousPaymentGate = process.env.PAYMENTS_APPROVED
afterEach(() => { process.env.AI_CLINICAL_APPROVED = previousAiGate; process.env.PAYMENTS_APPROVED = previousPaymentGate })

describe('external service gates', () => {
  it('does not call AI before clinical approval', async () => {
    delete process.env.AI_CLINICAL_APPROVED
    const result = await aiPlan.fetch(new Request('https://example.test/api/ai-plan', { method: 'POST' }))
    expect(result.status).toBe(503)
  })
  it('does not start checkout before payment approval', async () => {
    delete process.env.PAYMENTS_APPROVED
    const result = await createCheckout.fetch(new Request('https://example.test/api/create-checkout', { method: 'POST' }))
    expect(result.status).toBe(503)
  })
  it('rejects an unsigned webhook', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder'
    const result = await stripeWebhook.fetch(new Request('https://example.test/api/stripe-webhook', { method: 'POST', body: '{}' }))
    expect(result.status).toBe(400)
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
  })
})
