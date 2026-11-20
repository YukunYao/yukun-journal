import { useState, type FormEvent } from 'react'
import { setPersonalPlan, type JournalState, type PersonalPlanSections } from './domain'

const blank: PersonalPlanSections = { foodRhythm: '', movement: '', recovery: '', weeklyFocus: '' }
const fields: { key: keyof PersonalPlanSections; label: string; hint: string }[] = [
  { key: 'foodRhythm', label: 'Food rhythm', hint: 'A routine you want to make room for' },
  { key: 'movement', label: 'Movement', hint: 'Ways of moving that feel possible' },
  { key: 'recovery', label: 'Recovery', hint: 'Rest and support you want to protect' },
  { key: 'weeklyFocus', label: 'This week', hint: 'One gentle focus, if you want one' },
]

export function PersonalPlanEditor({ journal, onSave }: { journal: JournalState; onSave: (next: JournalState) => Promise<void> }) {
  const [draft, setDraft] = useState<PersonalPlanSections>(() => journal.personalPlan ?? blank)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setMessage('')
    try {
      const next = setPersonalPlan(journal, draft)
      await onSave(next)
      setMessage(next.personalPlan ? 'Your plan was saved.' : 'Your plan was cleared.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save your plan. Your draft is still here.') }
    finally { setBusy(false) }
  }

  return <section className="personal-plan" aria-labelledby="personal-plan-title">
    <p className="eyebrow">Written by you</p><h2 id="personal-plan-title">Your own plan</h2>
    <p>Write only what helps. Leave any part blank, change it when life changes, or keep recording without a plan.</p>
    <form onSubmit={save}>
      <div className="personal-plan-grid">{fields.map(({ key, label, hint }) => <label key={key}>{label}<small>{hint}</small><textarea rows={3} maxLength={500} value={draft[key]} onChange={(event) => { setDraft((old) => ({ ...old, [key]: event.target.value })); setMessage('') }} /></label>)}</div>
      <div className="personal-plan-actions"><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save my plan'}</button>{journal.personalPlan && <button className="text-button" type="button" disabled={busy} onClick={() => { setDraft(blank); setMessage('Clear the fields, then save to remove this plan.') }}>Clear fields</button>}</div>
      {message && <p role="status" className="service-message">{message}</p>}
    </form>
  </section>
}
