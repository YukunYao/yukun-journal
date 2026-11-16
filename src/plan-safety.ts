export interface PlanAnswers {
  age: number
  consent: boolean
  pregnant: boolean
  breastfeeding: boolean
  postpartumNeedsCare: boolean
  currentEatingDisorder: boolean
  medicalConcern: boolean
  goal: string
  routine: string
}

export function eligibility(answers: PlanAnswers): { eligible: boolean; message: string } {
  if (!answers.consent) return { eligible: false, message: 'Choose whether to share these answers before requesting a plan.' }
  if (!Number.isInteger(answers.age) || answers.age < 18) return { eligible: false, message: 'This preview cannot generate youth plans. Youth Mode needs guardian and clinical review.' }
  if (answers.pregnant || answers.breastfeeding || answers.postpartumNeedsCare || answers.currentEatingDisorder || answers.medicalConcern) {
    return { eligible: false, message: 'An automated weight plan may not fit your situation. You can keep journaling gently and discuss personalized care with a qualified professional.' }
  }
  return { eligible: true, message: '' }
}

export function parsePlanAnswers(value: unknown): PlanAnswers | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.age !== 'number' || typeof v.consent !== 'boolean' || typeof v.goal !== 'string' || typeof v.routine !== 'string') return null
  if (v.goal.length > 500 || v.routine.length > 500) return null
  for (const field of ['pregnant', 'breastfeeding', 'postpartumNeedsCare', 'currentEatingDisorder', 'medicalConcern']) if (typeof v[field] !== 'boolean') return null
  return v as unknown as PlanAnswers
}
