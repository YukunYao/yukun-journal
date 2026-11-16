import { describe, expect, it } from 'vitest'
import { eligibility, parsePlanAnswers, type PlanAnswers } from './plan-safety'

const safe: PlanAnswers = { age: 26, consent: true, pregnant: false, breastfeeding: false, postpartumNeedsCare: false, currentEatingDisorder: false, medicalConcern: false, goal: 'Build steady habits', routine: 'Walk after work' }

describe('AI plan eligibility', () => {
  it('allows a consenting adult with no flagged conditions', () => expect(eligibility(safe).eligible).toBe(true))
  it.each(['pregnant', 'breastfeeding', 'postpartumNeedsCare', 'currentEatingDisorder', 'medicalConcern'] as const)('blocks %s', (field) => expect(eligibility({ ...safe, [field]: true }).eligible).toBe(false))
  it('blocks youth and missing consent', () => { expect(eligibility({ ...safe, age: 17 }).eligible).toBe(false); expect(eligibility({ ...safe, consent: false }).eligible).toBe(false) })
  it('rejects missing health answers', () => expect(parsePlanAnswers({ ...safe, pregnant: undefined })).toBeNull())
})
