import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { JournalState } from './domain'
import { eligibility, type PlanAnswers } from './plan-safety'
import { supabase, servicesConfigured } from './services'

export interface CloudActions {
  mode: 'local' | 'cloud'
  local: JournalState
  openCloud: () => Promise<void>
  copyLocal: () => Promise<void>
  createCloud: () => Promise<void>
  useLocal: () => void
  cloudExists: boolean | null
  busy: boolean
}

export function AccountPage({ session, actions, onNavigate }: { session: Session | null; actions: CloudActions; onNavigate: (path: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)
  const [formMode, setFormMode] = useState<'signin' | 'signup'>('signin')
  const submit = async (event: FormEvent<HTMLFormElement>, signup: boolean) => {
    event.preventDefault()
    if (!supabase) return
    setWorking(true); setMessage('')
    const result = signup ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password })
    setMessage(result.error?.message ?? (signup && !result.data.session ? 'Check your email to confirm your account, then sign in.' : 'Signed in. Choose where to keep your journal below.'))
    setWorking(false)
  }
  const hasLocal = actions.local.entries.length > 0 || actions.local.weights.length > 0 || Boolean(actions.local.spiritName)
  return <main className="content-page reading-page service-page"><p className="eyebrow">Your space</p><h1>Account & cloud</h1>
    {!servicesConfigured && <><p className="lead">Accounts are waiting for the YUKUN cloud project to be connected.</p><p>Your journal remains available in this browser. Export a copy from My Day if you want a backup.</p></>}
    {servicesConfigured && !session && <><p className="lead">Sign in to save a separate cloud journal and return to it on another device.</p><div className="service-auth-grid"><form onSubmit={(event) => submit(event, formMode === 'signup')}><h2>{formMode === 'signup' ? 'Create account' : 'Sign in'}</h2><label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Password<input type="password" autoComplete={formMode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></label><button className="button primary" disabled={working}>{formMode === 'signup' ? 'Create free account' : 'Sign in'}</button></form><div><h2>{formMode === 'signup' ? 'Already have an account?' : 'New here?'}</h2><p>Your local journal stays on this device until you choose to copy it to your account.</p><button className="button outline" onClick={() => { setFormMode(formMode === 'signup' ? 'signin' : 'signup'); setMessage('') }}>{formMode === 'signup' ? 'Use sign in' : 'Create an account'}</button></div></div></>}
    {servicesConfigured && session && <><p className="lead">Signed in as {session.user.email}</p><p>Currently viewing: <strong>{actions.mode === 'cloud' ? 'Cloud journal' : 'This browser’s journal'}</strong>. Switching never deletes either copy.</p><div className="service-choice">
      {actions.mode === 'cloud' ? <><button className="button outline" disabled={actions.busy} onClick={() => void actions.openCloud()}>Refresh cloud journal</button><button className="button outline" onClick={actions.useLocal}>View this browser’s journal</button></> : <>
        {actions.cloudExists === true && <button className="button primary" disabled={actions.busy} onClick={() => void actions.openCloud()}>Open my cloud journal</button>}
        {actions.cloudExists === false && hasLocal && <button className="button primary" disabled={actions.busy} onClick={() => void actions.copyLocal()}>Copy this browser’s journal to cloud</button>}
        {actions.cloudExists === false && <button className="button outline" disabled={actions.busy} onClick={() => void actions.createCloud()}>Start an empty cloud journal</button>}
        {actions.cloudExists === null && <p>Checking your cloud journal…</p>}
      </>}
    </div><p className="fine-print">If a cloud journal already exists, this page will not overwrite it. Photos are copied into a private account folder. Keep a local export as an extra backup.</p><button className="text-button" onClick={async () => { await supabase?.auth.signOut(); actions.useLocal(); onNavigate('/my-day') }}>Sign out</button></>}
    {message && <p role="status" className="service-message">{message}</p>}
    <p><button className="text-button" onClick={() => onNavigate('/my-day')}>← Return to My Day</button></p>
  </main>
}

const initialAnswers: PlanAnswers = { age: 18, consent: false, pregnant: false, breastfeeding: false, postpartumNeedsCare: false, currentEatingDisorder: false, medicalConcern: false, goal: '', routine: '' }
type GeneratedPlan = { title: string; foodRhythm: string; movement: string; recovery: string; weeklyFocus: string; rationale: string; caution: string }

export function AiPlanPage({ session, onNavigate }: { session: Session | null; onNavigate: (path: string) => void }) {
  const [answers, setAnswers] = useState(initialAnswers)
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  useEffect(() => { if (session && supabase) supabase.from('ai_plans').select('plan').eq('user_id', session.user.id).maybeSingle().then(({ data }) => { if (data?.plan) setPlan(data.plan as GeneratedPlan) }) }, [session])
  const setFlag = (field: keyof PlanAnswers, value: boolean) => setAnswers((previous) => ({ ...previous, [field]: value }))
  const checked = eligibility(answers)
  const generate = async (event: FormEvent) => {
    event.preventDefault(); if (!session || !checked.eligible) return
    setWorking(true); setError('')
    try {
      const response = await fetch('/api/ai-plan', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(answers) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Plan unavailable.')
      setPlan(payload.plan)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Plan unavailable.') }
    finally { setWorking(false) }
  }
  return <main className="content-page reading-page service-page"><p className="eyebrow">Optional guidance</p><h1>AI Plan</h1><p className="lead">A flexible weekly framework can sit beside your journal. Recording never requires a plan.</p>
    {!session ? <><p>Sign in before sharing health answers for a plan.</p><button className="button primary" onClick={() => onNavigate('/account')}>Go to account</button></> : <>
      {plan && <section className="plan-card"><h2>{plan.title}</h2><dl>{([['Food rhythm', plan.foodRhythm], ['Movement', plan.movement], ['Recovery', plan.recovery], ['This week', plan.weeklyFocus], ['Why this fits', plan.rationale]] as const).map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><p className="fine-print">{plan.caution}</p></section>}
      <form onSubmit={generate} className="plan-questionnaire"><h2>{plan ? 'Request a new plan' : 'Before a plan'}</h2><p>These answers are sent only when you press Generate. Your journal entries are not sent.</p><label>Age<input type="number" min="13" max="120" value={answers.age} onChange={(e) => setAnswers((v) => ({ ...v, age: Number(e.target.value) }))} required /></label><label>What would you like help with?<textarea maxLength={500} value={answers.goal} onChange={(e) => setAnswers((v) => ({ ...v, goal: e.target.value }))} required /></label><label>What does your current routine look like?<textarea maxLength={500} value={answers.routine} onChange={(e) => setAnswers((v) => ({ ...v, routine: e.target.value }))} required /></label><fieldset><legend>Health & safety</legend>{([['pregnant','I am pregnant'],['breastfeeding','I am breastfeeding'],['postpartumNeedsCare','I am postpartum and need medical guidance'],['currentEatingDisorder','I currently have an eating disorder or significant eating concerns'],['medicalConcern','I have another health concern that needs medical guidance']] as const).map(([field,label]) => <label className="check-row" key={field}><input type="checkbox" checked={answers[field]} onChange={(e) => setFlag(field,e.target.checked)} />{label}</label>)}</fieldset><label className="check-row"><input type="checkbox" checked={answers.consent} onChange={(e) => setFlag('consent',e.target.checked)} />I choose to share these answers with the AI plan service.</label>{answers.consent && !checked.eligible && <p className="service-message">{checked.message}</p>}<button className="button primary" disabled={working || !checked.eligible || !answers.goal.trim() || !answers.routine.trim()}>{working ? 'Preparing…' : 'Generate a gentle plan'}</button>{error && <p className="form-error" role="alert">{error}</p>}</form>
    </>}
  </main>
}
