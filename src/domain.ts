export type EntryKind = 'meal' | 'movement' | 'mood' | 'cycle' | 'note'
export type WeightUnit = 'kg' | 'lb'

export interface Entry {
  id: string
  kind: EntryKind
  date: string
  title: string
  detail?: string
  mealSlot?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
  calories?: number
  duration?: number
  photo?: Blob
  createdAt: string
  updatedAt: string
}

export type EntryInput = Pick<Entry, 'kind' | 'date' | 'title'> & Partial<Pick<Entry, 'detail' | 'mealSlot' | 'calories' | 'duration' | 'photo'>>
export interface WeightRecord { date: string; value: number; unit: WeightUnit; kg: number; updatedAt: string }
export interface SeedGrant { date: string; kind: EntryKind; amount: number }
export interface JournalState {
  entries: Entry[]
  weights: WeightRecord[]
  seedLedger: SeedGrant[]
  spiritName: string
}

export function emptyJournal(): JournalState {
  return { entries: [], weights: [], seedLedger: [], spiritName: '' }
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function rangeStartDate(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() - days)
  return localDateKey(date)
}

export function addEntry(state: JournalState, input: EntryInput, now = new Date()): JournalState {
  const title = input.title.trim()
  if (!title) throw new Error(input.kind === 'meal' ? 'Add at least one food name.' : 'Add a short description before saving.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Choose a valid date.')
  if (input.date > localDateKey(now)) throw new Error('Future dates cannot be recorded yet.')
  const entry: Entry = {
    ...input,
    id: crypto.randomUUID(),
    title,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  const seedLedger = [...state.seedLedger]
  if (input.date === localDateKey(now) && !seedLedger.some((grant) => grant.date === input.date && grant.kind === input.kind)) {
    const grantsToday = seedLedger.filter((grant) => grant.date === input.date).length
    if (grantsToday < 3) seedLedger.push({ date: input.date, kind: input.kind, amount: grantsToday === 0 ? 10 : 3 })
  }
  return { ...state, entries: [...state.entries, entry], seedLedger }
}

export function updateEntry(state: JournalState, id: string, input: EntryInput, now = new Date()): JournalState {
  const title = input.title.trim()
  if (!title) throw new Error(input.kind === 'meal' ? 'Add at least one food name.' : 'Add a short description before saving.')
  return {
    ...state,
    entries: state.entries.map((entry) => entry.id === id ? { ...entry, ...input, title, updatedAt: now.toISOString() } : entry),
  }
}

export function upsertWeight(state: JournalState, input: { date: string; value: number; unit: WeightUnit }, now = new Date()): JournalState {
  if (!Number.isFinite(input.value) || input.value <= 0) throw new Error('Enter a valid weight.')
  if (input.date > localDateKey(now)) throw new Error('Future dates cannot be recorded yet.')
  const record: WeightRecord = { ...input, kg: input.unit === 'lb' ? input.value * 0.45359237 : input.value, updatedAt: now.toISOString() }
  return { ...state, weights: [...state.weights.filter((item) => item.date !== input.date), record].sort((a, b) => a.date.localeCompare(b.date)) }
}

const companionLines = [
  'You showed up for yourself today.',
  'Small moments of care still count.',
  'There is no rush. I am here.',
  'You are worthy of kindness right now.',
  'A pause can be part of moving forward.',
  'Today can be gentle and still be yours.',
  'You are more than a number.',
]

export function dailyMessage(date: Date): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayIndex = (monday.getDay() + 6) % 7
  monday.setDate(monday.getDate() - dayIndex)
  let seed = Number(localDateKey(monday).replaceAll('-', ''))
  const order = companionLines.map((_, index) => index)
  for (let i = order.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    const j = seed % (i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return companionLines[order[dayIndex]]
}
