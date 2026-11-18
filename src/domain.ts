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
export interface SeedUnlock { itemId: string; cost: number; unlockdAt: string }
export interface WeightGoal { targetKg: number; baselineKg: number; closestKg: number; awardedSteps: number }
export const seedCatalog = [
  { id: 'rose-scarf', name: 'Rose scarf', category: 'outfit', cost: 10, image: '/assets/room-scarf.png' },
  { id: 'blue-sleep-cap', name: 'Blue sleep cap', category: 'outfit', cost: 20, image: '/assets/room-hat.png' },
  { id: 'felt-star-garland', name: 'Felt star garland', category: 'decor', cost: 15, image: '/assets/room-garland.png' },
] as const
export type SeedItemId = typeof seedCatalog[number]['id']
export interface JournalState {
  entries: Entry[]
  weights: WeightRecord[]
  seedLedger: SeedGrant[]
  spiritName: string
  seedUnlocks: SeedUnlock[]
  equippedOutfit: string | null
  equippedDecor: string | null
  weightGoal: WeightGoal | null
  weightSeedGrants: { date: string; amount: number }[]
}

export function emptyJournal(): JournalState {
  return { entries: [], weights: [], seedLedger: [], spiritName: '', seedUnlocks: [], equippedOutfit: null, equippedDecor: null, weightGoal: null, weightSeedGrants: [] }
}

export function normalizeJournal(value: Partial<JournalState> | null | undefined): JournalState {
  const legacyUnlocks = (value as Partial<JournalState> & { seedPurchases?: SeedUnlock[] } | undefined)?.seedPurchases
  return { ...emptyJournal(), ...value, seedUnlocks: value?.seedUnlocks ?? legacyUnlocks ?? [], weightSeedGrants: value?.weightSeedGrants ?? [] }
}

export function seedBalance(state: JournalState): number {
  return state.seedLedger.reduce((sum, item) => sum + item.amount, 0) + (state.weightSeedGrants ?? []).reduce((sum, item) => sum + item.amount, 0) - (state.seedUnlocks ?? []).reduce((sum, item) => sum + item.cost, 0)
}

export function buySeedItem(state: JournalState, itemId: SeedItemId, now = new Date()): JournalState {
  const item = seedCatalog.find((candidate) => candidate.id === itemId)
  if (!item) throw new Error('This item is unavailable.')
  if ((state.seedUnlocks ?? []).some((unlock) => unlock.itemId === itemId)) throw new Error('This item is already yours.')
  if (seedBalance(state) < item.cost) throw new Error('Not enough Light Seeds yet.')
  return { ...state, seedUnlocks: [...(state.seedUnlocks ?? []), { itemId, cost: item.cost, unlockdAt: now.toISOString() }] }
}

export function equipSeedItem(state: JournalState, itemId: SeedItemId | null, category: 'outfit' | 'decor'): JournalState {
  if (itemId) {
    const item = seedCatalog.find((candidate) => candidate.id === itemId)
    if (!item || item.category !== category || !(state.seedUnlocks ?? []).some((unlock) => unlock.itemId === itemId)) throw new Error('Unlock this item first.')
  }
  return category === 'outfit' ? { ...state, equippedOutfit: itemId } : { ...state, equippedDecor: itemId }
}

export function setWeightGoal(state: JournalState, target: number, unit: WeightUnit): JournalState {
  if (!Number.isFinite(target) || target <= 0) throw new Error('Enter a valid target weight.')
  if (Math.abs(target * 100 - Math.round(target * 100)) > 0.000001) throw new Error('Use no more than two decimal places.')
  const latest = [...state.weights].sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!latest) throw new Error('Log a current weight before setting a goal.')
  const targetKg = unit === 'lb' ? target * 0.45359237 : target
  if (Math.abs(latest.kg - targetKg) < 0.1) throw new Error('Choose a target at least 0.1 kg from your current record.')
  return { ...state, weightGoal: { targetKg, baselineKg: latest.kg, closestKg: latest.kg, awardedSteps: 0 } }
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
  if (Math.abs(input.value * 100 - Math.round(input.value * 100)) > 0.000001) throw new Error('Use no more than two decimal places.')
  if (input.date > localDateKey(now)) throw new Error('Future dates cannot be recorded yet.')
  const record: WeightRecord = { ...input, kg: input.unit === 'lb' ? input.value * 0.45359237 : input.value, updatedAt: now.toISOString() }
  const next = { ...state, weights: [...state.weights.filter((item) => item.date !== input.date), record].sort((a, b) => a.date.localeCompare(b.date)) }
  const goal = state.weightGoal
  if (!goal || input.date !== localDateKey(now) || state.weightSeedGrants.some((grant) => grant.date === input.date)) return next
  const oldDistance = Math.abs(goal.closestKg - goal.targetKg)
  const newDistance = Math.abs(record.kg - goal.targetKg)
  if (newDistance >= oldDistance - 0.099999) return next
  const totalSteps = Math.floor((Math.abs(goal.baselineKg - goal.targetKg) - newDistance + 0.000001) / 0.1)
  const amount = Math.min(5, Math.max(0, totalSteps - goal.awardedSteps))
  if (!amount) return next
  return { ...next, weightGoal: { ...goal, closestKg: record.kg, awardedSteps: totalSteps }, weightSeedGrants: [...state.weightSeedGrants, { date: input.date, amount }] }
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
