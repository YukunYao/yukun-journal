import { useEffect, useRef, useState, type FormEvent } from 'react'
import { rangeStartDate, type Entry, type EntryInput, type EntryKind, type JournalState, type WeightUnit } from './domain'
import { scene, labels, formatDate } from './presentation'


export function Photo({ blob, alt }: { blob: Blob; alt: string }) {
  const imageRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(blob)
    if (imageRef.current) imageRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [blob])
  return <img ref={imageRef} className="food-sticker" alt={alt} />
}

export function Scene({ message, compact = false, variant = 'room', image }: { message?: string; compact?: boolean; variant?: 'room' | 'hero'; image?: string }) {
  return <div className={`scene scene-${variant} ${compact ? 'scene-compact' : ''}`}><img src={variant === 'hero' ? '/assets/yukun-hero-v2.png' : image ?? scene} alt="The original cream-colored YUKUN companion in a warm miniature room" />{message && <p className="scene-message">{message}<span aria-hidden="true"> ♥</span></p>}</div>
}

export function EntryDrawer({ date, todayKey, entry, initialMealSlot, onClose, onSave }: { date: string; todayKey: string; entry?: Entry; initialMealSlot?: Entry['mealSlot']; onClose: () => void; onSave: (input: EntryInput, id?: string) => Promise<void> }) {
  const [currentHour] = useState(() => new Date().getHours())
  const suggestedMealSlot: Entry['mealSlot'] = currentHour < 11 ? 'Breakfast' : currentHour < 15 ? 'Lunch' : currentHour < 20 ? 'Dinner' : 'Snack'
  const [step, setStep] = useState<'type' | 'source' | 'form'>(entry ? 'form' : initialMealSlot ? 'source' : 'type')
  const [kind, setKind] = useState<EntryKind>(entry?.kind ?? 'meal')
  const [selectedDate, setSelectedDate] = useState(entry?.date ?? date)
  const [title, setTitle] = useState(entry?.title ?? '')
  const [detail, setDetail] = useState(entry?.detail ?? '')
  const [mealSlot, setMealSlot] = useState<Entry['mealSlot']>(entry?.mealSlot ?? initialMealSlot ?? suggestedMealSlot)
  const [calories, setCalories] = useState(entry?.calories?.toString() ?? '')
  const [duration, setDuration] = useState(entry?.duration?.toString() ?? '')
  const [photo, setPhoto] = useState<Blob | undefined>(entry?.photo)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  useEffect(() => { const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; addEventListener('keydown', escape); return () => removeEventListener('keydown', escape) }, [onClose])
  function choosePhoto(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 10_000_000) { setError('Choose an image smaller than 10 MB.'); return }
    setPhoto(file); setError(''); setStep('form')
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      await onSave({ kind, date: selectedDate, title, detail: detail.trim() || undefined, mealSlot: kind === 'meal' ? mealSlot : undefined, calories: kind === 'meal' && calories ? Number(calories) : undefined, duration: kind === 'movement' && duration ? Number(duration) : undefined, photo: kind === 'meal' ? photo : undefined }, entry?.id)
      onClose()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save. Your draft is still here.') }
    finally { setBusy(false) }
  }
  const back = () => setStep(step === 'form' && kind === 'meal' && !entry ? 'source' : 'type')
  return <div className="modal-shade" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="entry-drawer" role="dialog" aria-modal="true" aria-labelledby="entry-title">
    <div className="drawer-top">{step === 'type' ? <span /> : entry ? <span className="eyebrow">Edit entry</span> : <button className="text-button" onClick={back}>← New entry</button>}<button className="text-button close-drawer" onClick={onClose} aria-label="Close entry form">×</button></div>
    {step === 'type' && <><p className="eyebrow">New entry</p><h2 id="entry-title">What would you like to record?</h2><p className="muted drawer-lead">Choose one. You can always add another entry later.</p><div className="choice-list">{(Object.keys(labels) as EntryKind[]).map((type) => <button type="button" key={type} onClick={() => { setKind(type); setStep(type === 'meal' ? 'source' : 'form') }}><span className="choice-icon" aria-hidden="true">{({meal:'✿',movement:'↗',mood:'♡',cycle:'◌',note:'▤'} as Record<EntryKind,string>)[type]}</span><span><strong>{labels[type]}</strong><small>{({meal:'Photo or text, with optional calories',movement:'What you did and how long',mood:'A feeling and a few words',cycle:'A little context about your cycle',note:'Anything else from today'} as Record<EntryKind,string>)[type]}</small></span><span className="choice-arrow" aria-hidden="true">→</span></button>)}</div></>}
    {step === 'source' && <><p className="eyebrow">Meal</p><h2 id="entry-title">How would you like to add it?</h2><p className="muted drawer-lead">Start with a photo or keep it simple with words.</p><div className="choice-list"><button type="button" onClick={() => cameraRef.current?.click()}><span className="choice-icon" aria-hidden="true">▣</span><span><strong>Take a photo</strong><small>Use your camera</small></span><span className="choice-arrow" aria-hidden="true">→</span></button><button type="button" onClick={() => uploadRef.current?.click()}><span className="choice-icon" aria-hidden="true">↑</span><span><strong>Upload a photo</strong><small>Choose one from this device</small></span><span className="choice-arrow" aria-hidden="true">→</span></button><button type="button" onClick={() => setStep('form')}><span className="choice-icon" aria-hidden="true">▤</span><span><strong>Text only</strong><small>Record the meal without a photo</small></span><span className="choice-arrow" aria-hidden="true">→</span></button></div><input className="visually-hidden" ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(event) => choosePhoto(event.target.files?.[0])} /><input className="visually-hidden" ref={uploadRef} type="file" accept="image/*" onChange={(event) => choosePhoto(event.target.files?.[0])} />{error && <p className="form-error" role="alert">{error}</p>}<p className="fine-print source-note">YUKUN never identifies food or estimates calories from your photo.</p></>}
    {step === 'form' && <><p className="eyebrow">{labels[kind]}</p><h2 id="entry-title">{entry ? 'Edit your entry' : kind === 'meal' ? 'A little note for today.' : `Record ${labels[kind].toLowerCase()}.`}</h2><p className="muted drawer-lead">Write only what you want to remember.</p><form onSubmit={submit} className="entry-form">
      {kind === 'meal' && <><label>Meal time<select value={mealSlot} onChange={(event) => setMealSlot(event.target.value as Entry['mealSlot'])}><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select></label>{photo && <div className="photo-preview"><Photo blob={photo} alt="Meal photo preview" /><button type="button" className="text-button" onClick={() => setPhoto(undefined)}>Remove photo</button></div>}<label className="upload-zone">{photo ? 'Change photo' : 'Add a photo (optional)'}<input className="visually-hidden" type="file" accept="image/*" onChange={(event) => choosePhoto(event.target.files?.[0])} /></label></>}
      <label>{kind === 'meal' ? 'What did you eat? *' : kind === 'movement' ? 'How did you move? *' : kind === 'mood' ? 'How are you feeling? *' : kind === 'cycle' ? 'What would you like to record? *' : 'Your note *'}<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === 'meal' ? 'Food names in your own words' : 'A short description'} /></label>
      {kind === 'movement' && <label>Minutes (optional)<input type="number" min="1" max="1440" value={duration} onChange={(event) => setDuration(event.target.value)} /></label>}
      {kind === 'meal' && <details><summary>Add calories manually (optional)</summary><label>Calories you entered<input type="number" min="0" value={calories} onChange={(event) => setCalories(event.target.value)} /></label><p className="fine-print">YUKUN does not identify food or estimate calories from photos.</p></details>}
      <label>More detail (optional)<textarea rows={4} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Only what you want to remember" /></label>
      <label>Journal date<input type="date" max={todayKey} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error} Your draft has not been cleared.</p>}<button className="button primary" disabled={busy || !title.trim()}>{busy ? 'Saving…' : entry ? 'Save changes' : 'Add to my day'}</button>
    </form></>}
    {step !== 'form' && <div className="drawer-date"><span>{formatDate(selectedDate)}</span><small>You can record today or a past day.</small></div>}
  </aside></div>
}

export function WeightDialog({ date, previous, onClose, onSave }: { date: string; previous?: { value: number; unit: WeightUnit }; onClose: () => void; onSave: (value: number, unit: WeightUnit) => Promise<void> }) {
  const [value, setValue] = useState(previous?.value.toString() ?? '')
  const [unit, setUnit] = useState<WeightUnit>(previous?.unit ?? 'lb')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); if (previous && !window.confirm('Replace the weight recorded for this day?')) return; setBusy(true); try { await onSave(Number(value), unit); onClose() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save. Your value is still here.') } finally { setBusy(false) } }
  return <div className="modal-shade" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="weight-dialog" role="dialog" aria-modal="true" aria-labelledby="weight-title"><div className="drawer-top"><span className="eyebrow">{formatDate(date)}</span><button className="text-button" onClick={onClose}>Close ×</button></div><h2 id="weight-title">{previous ? 'Edit weight' : 'Log weight'}</h2><p className="muted">Optional, and always on your terms.</p><form onSubmit={submit}><div className="weight-fields"><label>Weight<input autoFocus type="number" step="0.1" min="1" required value={value} onChange={(event) => setValue(event.target.value)} /></label><label>Unit<select value={unit} onChange={(event) => setUnit(event.target.value as WeightUnit)}><option value="lb">lb</option><option value="kg">kg</option></select></label></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary" disabled={busy}>{busy ? 'Saving…' : previous ? 'Replace this day’s value' : 'Save weight'}</button></form></div></div>
}

export function WeightChart({ state, todayKey, range = 'all' }: { state: JournalState; todayKey: string; range?: string }) {
  const weights = [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).filter((item) => range === 'all' || item.date >= rangeStartDate(todayKey, Number(range)))
  if (!weights.length) return <div className="chart-empty">Your weight trend will appear here if you choose to record it.</div>
  const min = Math.min(...weights.map((item) => item.kg)) - 1, max = Math.max(...weights.map((item) => item.kg)) + 1
  const first = new Date(`${weights[0].date}T12:00:00`).getTime(), last = new Date(`${weights.at(-1)!.date}T12:00:00`).getTime()
  const x = (date: string) => last === first ? 50 : 6 + (new Date(`${date}T12:00:00`).getTime() - first) / (last - first) * 88
  const y = (kg: number) => 83 - (kg - min) / (max - min) * 66
  return <div className="weight-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Weight trend with ${weights.length} recorded ${weights.length === 1 ? 'day' : 'days'}`}><path d="M 5 84 H 96" stroke="#e8dfd9" strokeWidth=".5" fill="none" />{weights.length > 1 && <polyline points={weights.map((item) => `${x(item.date)},${y(item.kg)}`).join(' ')} fill="none" stroke="#929c80" strokeWidth="1" vectorEffect="non-scaling-stroke" />}{weights.map((item) => <circle key={item.date} cx={x(item.date)} cy={y(item.kg)} r="1.4" fill="#858d74" />)}</svg><div className="chart-axis"><span>{formatDate(weights[0].date, { month: 'short', day: 'numeric' })}</span><span>{formatDate(weights.at(-1)!.date, { month: 'short', day: 'numeric' })}</span></div></div>
}
