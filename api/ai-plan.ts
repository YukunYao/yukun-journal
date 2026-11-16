import OpenAI from 'openai'
import { adminClient, authenticatedUser, json } from '../server/shared'
import { eligibility, parsePlanAnswers } from '../src/plan-safety'

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    title: { type: 'string' }, foodRhythm: { type: 'string' }, movement: { type: 'string' }, recovery: { type: 'string' }, weeklyFocus: { type: 'string' }, rationale: { type: 'string' }, caution: { type: 'string' },
  },
  required: ['title', 'foodRhythm', 'movement', 'recovery', 'weeklyFocus', 'rationale', 'caution'],
} as const

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
    if (process.env.AI_CLINICAL_APPROVED !== 'true') return json({ error: 'AI plans are awaiting clinical review.' }, 503)
    const user = await authenticatedUser(request)
    if (!user) return json({ error: 'Sign in before requesting a plan.' }, 401)
    let answers
    try { answers = parsePlanAnswers(await request.json()) } catch { return json({ error: 'Invalid questionnaire.' }, 400) }
    if (!answers) return json({ error: 'Complete every safety answer.' }, 400)
    const checked = eligibility(answers)
    if (!checked.eligible) return json({ error: checked.message }, 422)
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) return json({ error: 'AI service is not configured.' }, 503)
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const response = await openai.responses.create({
        model: process.env.OPENAI_MODEL,
        store: false,
        instructions: 'You write a brief, gentle adult wellbeing plan. This is educational and not medical care. Use only the given answers. Give flexible weekly guidance for regular eating, enjoyable movement, rest and self-kindness. Do not give calorie targets, weight targets, weight-loss timelines, restrictions, diagnosis, treatment, or claims of guaranteed outcomes. Never shame food, bodies, or missed days. Keep each field under 45 words. The caution field must advise professional care when needs change.',
        input: JSON.stringify({ goal: answers.goal, routine: answers.routine }),
        text: { format: { type: 'json_schema', name: 'gentle_weekly_plan', strict: true, schema } },
      })
      if (response.status !== 'completed' || !response.output_text) return json({ error: 'A plan could not be generated safely. Try again later.' }, 502)
      const plan = JSON.parse(response.output_text) as Record<string, string>
      const { error } = await adminClient().from('ai_plans').upsert({ user_id: user.id, plan, updated_at: new Date().toISOString() })
      if (error) throw error
      return json({ plan })
    } catch { return json({ error: 'The plan service is temporarily unavailable.' }, 502) }
  },
}
