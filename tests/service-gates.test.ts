import { afterEach, describe, expect, it } from 'vitest'
import aiPlan from '../api/ai-plan'

const previousAiGate = process.env.AI_CLINICAL_APPROVED
afterEach(() => { process.env.AI_CLINICAL_APPROVED = previousAiGate })

describe('external service gates', () => {
  it('does not call AI before clinical approval', async () => {
    delete process.env.AI_CLINICAL_APPROVED
    const result = await aiPlan.fetch(new Request('https://example.test/api/ai-plan', { method: 'POST' }))
    expect(result.status).toBe(503)
  })
})
