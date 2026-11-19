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
export interface WeightSeedGrant { date: string; amount: number; targetKg?: number; baselineKg?: number; basisKg?: number; basisSteps?: number }
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
  weightSeedGrants: WeightSeedGrant[]
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

export function setWeightGoal(state: JournalState, target: number, unit: WeightUnit, now = new Date()): JournalState {
  if (!Number.isFinite(target) || target <= 0) throw new Error('Enter a valid target weight.')
  if (Math.abs(target * 100 - Math.round(target * 100)) > 0.000001) throw new Error('Use no more than two decimal places.')
  const weights = [...state.weights].sort((a, b) => b.date.localeCompare(a.date))
  const latest = weights[0]
  if (!latest) throw new Error('Log a current weight before setting a goal.')
  const targetKg = unit === 'lb' ? target * 0.45359237 : target
  if (state.weightGoal && Math.abs(state.weightGoal.targetKg - targetKg) < 0.000001) return state
  if (Math.abs(latest.kg - targetKg) < 0.1) throw new Error('Choose a target at least 0.1 kg from your current record.')
  const prior = !state.weightGoal && latest.date === localDateKey(now) ? weights[1] : undefined
  const baselineKg = prior?.kg ?? latest.kg
  const progress = prior ? Math.abs(prior.kg - targetKg) - Math.abs(latest.kg - targetKg) : 0
  const steps = progress >= 0.099999 ? Math.floor((progress + 0.000001) / 0.1) : 0
  const amount = state.weightSeedGrants.some((grant) => grant.date === latest.date) ? 0 : Math.min(5, steps)
  return {
    ...state,
    weightGoal: { targetKg, baselineKg, closestKg: amount ? latest.kg : baselineKg, awardedSteps: amount ? steps : 0 },
    weightSeedGrants: amount ? [...state.weightSeedGrants, { date: latest.date, amount, targetKg, baselineKg, basisKg: baselineKg, basisSteps: 0 }] : state.weightSeedGrants,
  }
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
  if (!goal || input.date !== localDateKey(now)) return next
  const previousGrant = state.weightSeedGrants.find((grant) => grant.date === input.date)
  const previousBest = [goal.baselineKg, ...state.weights.filter((item) => item.date < input.date).map((item) => item.kg)]
    .reduce((best, kg) => Math.abs(kg - goal.targetKg) < Math.abs(best - goal.targetKg) ? kg : best, goal.baselineKg)
  const targetKg = previousGrant?.targetKg ?? goal.targetKg
  const baselineKg = previousGrant?.baselineKg ?? goal.baselineKg
  const basisKg = previousGrant?.basisKg ?? (previousGrant ? previousBest : goal.closestKg)
  const basisSteps = previousGrant?.basisSteps ?? (previousGrant
    ? Math.max(0, Math.floor((Math.abs(baselineKg - targetKg) - Math.abs(basisKg - targetKg) + 0.000001) / 0.1))
    : goal.awardedSteps)
  const totalSteps = Math.max(0, Math.floor((Math.abs(baselineKg - targetKg) - Math.abs(record.kg - targetKg) + 0.000001) / 0.1))
  const steps = Math.max(0, totalSteps - basisSteps)
  const amount = Math.min(5, steps)
  if (!previousGrant && !amount) return next
  const weightSeedGrants = state.weightSeedGrants.filter((grant) => grant.date !== input.date)
  if (amount) weightSeedGrants.push({ date: input.date, amount, targetKg, baselineKg, basisKg, basisSteps })
  const adjusted: JournalState = {
    ...next,
    weightGoal: targetKg === goal.targetKg
      ? { ...goal, closestKg: amount ? record.kg : basisKg, awardedSteps: amount ? totalSteps : basisSteps }
      : state.weights.some((item) => item.date === input.date && Math.abs(item.kg - goal.baselineKg) < 0.000001)
        ? { ...goal, baselineKg: record.kg, closestKg: record.kg }
        : goal,
    weightSeedGrants,
  }
  if (!previousGrant || amount >= previousGrant.amount || seedBalance(adjusted) >= 0) return adjusted
  const seedUnlocks = [...adjusted.seedUnlocks]
  let balance = seedBalance(adjusted)
  let equippedOutfit = adjusted.equippedOutfit
  let equippedDecor = adjusted.equippedDecor
  while (balance < 0 && seedUnlocks.length) {
    const invalidated = seedUnlocks.pop()!
    balance += invalidated.cost
    if (equippedOutfit === invalidated.itemId) equippedOutfit = null
    if (equippedDecor === invalidated.itemId) equippedDecor = null
  }
  return { ...adjusted, seedUnlocks, equippedOutfit, equippedDecor }
}

export type WeightRewardReason = 'earned' | 'corrected-down' | 'corrected-unchanged' | 'past-date' | 'no-goal' | 'not-closer'

export function weightRewardReason(before: JournalState, after: JournalState, date: string, now = new Date()): WeightRewardReason {
  const beforeAmount = before.weightSeedGrants.find((grant) => grant.date === date)?.amount ?? 0
  const afterAmount = after.weightSeedGrants.find((grant) => grant.date === date)?.amount ?? 0
  if (afterAmount > beforeAmount) return 'earned'
  if (afterAmount < beforeAmount) return 'corrected-down'
  if (date !== localDateKey(now)) return 'past-date'
  if (!before.weightGoal) return 'no-goal'
  if (before.weights.some((weight) => weight.date === date)) return 'corrected-unchanged'
  return 'not-closer'
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
