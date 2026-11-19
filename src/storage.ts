import { emptyJournal, normalizeJournal, type JournalState } from './domain'

const DB_NAME = 'yukun-local-journal'
const STORE = 'journal'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Browser storage is unavailable.'))
  })
}

export async function loadJournal(): Promise<JournalState> {
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get('current')
      request.onsuccess = () => resolve(normalizeJournal((request.result as JournalState | undefined) ?? emptyJournal()))
      request.onerror = () => reject(request.error ?? new Error('Could not read your journal.'))
    })
  } finally { db.close() }
}

export async function saveJournal(state: JournalState): Promise<void> {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite')
      transaction.objectStore(STORE).put(state, 'current')
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save your journal.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Could not save your journal.'))
    })
  } finally { db.close() }
}

export async function deleteJournal(): Promise<void> {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite')
      transaction.objectStore(STORE).delete('current')
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not delete your browser journal.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Could not delete your browser journal.'))
    })
  } finally { db.close() }
}

function blobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not include a photo in the export.'))
    reader.readAsDataURL(blob)
  })
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const dateKey = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
const array = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`This backup has invalid ${label}.`)
  return value
}

function photoFromDataUrl(value: unknown): Blob | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new Error('This backup has an invalid photo.')
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  if (!match) throw new Error('This backup has an invalid photo.')
  try {
    const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0))
    return new Blob([bytes], { type: match[1] })
  } catch { throw new Error('This backup has an invalid photo.') }
}

export function parseJournalExport(text: string): JournalState {
  let payload: unknown
  try { payload = JSON.parse(text) } catch { throw new Error('Choose a valid YUKUN backup file.') }
  if (!record(payload) || payload.format !== 'yukun-local-export') throw new Error('Choose a valid YUKUN backup file.')
  if (payload.version !== 1) throw new Error('This backup version is not supported.')
  if (!record(payload.journal)) throw new Error('This backup has no journal.')
  const source = payload.journal
  const entries = array(source.entries, 'entries').map((item) => {
    if (!record(item) || typeof item.id !== 'string' || !['meal', 'movement', 'mood', 'cycle', 'note'].includes(String(item.kind)) || !dateKey(item.date) || typeof item.title !== 'string' || typeof item.createdAt !== 'string' || typeof item.updatedAt !== 'string') throw new Error('This backup has invalid entries.')
    if (item.detail !== undefined && typeof item.detail !== 'string') throw new Error('This backup has invalid entries.')
    if (item.mealSlot !== undefined && !['Breakfast', 'Lunch', 'Dinner', 'Snack'].includes(String(item.mealSlot))) throw new Error('This backup has invalid entries.')
    if ((item.calories !== undefined && !finite(item.calories)) || (item.duration !== undefined && !finite(item.duration))) throw new Error('This backup has invalid entries.')
    return { ...item, photo: photoFromDataUrl(item.photo) }
  })
  array(source.weights, 'weights').forEach((item) => {
    if (!record(item) || !dateKey(item.date) || !finite(item.value) || !finite(item.kg) || !['kg', 'lb'].includes(String(item.unit)) || typeof item.updatedAt !== 'string') throw new Error('This backup has invalid weights.')
  })
  for (const [key, check] of [
    ['seedLedger', (item: Record<string, unknown>) => dateKey(item.date) && ['meal', 'movement', 'mood', 'cycle', 'note'].includes(String(item.kind)) && finite(item.amount)],
    ['seedUnlocks', (item: Record<string, unknown>) => typeof item.itemId === 'string' && finite(item.cost) && typeof item.unlockdAt === 'string'],
    ['weightSeedGrants', (item: Record<string, unknown>) => dateKey(item.date) && finite(item.amount)],
  ] as const) {
    if (source[key] !== undefined) array(source[key], key).forEach((item) => { if (!record(item) || !check(item)) throw new Error(`This backup has invalid ${key}.`) })
  }
  if (source.spiritName !== undefined && typeof source.spiritName !== 'string') throw new Error('This backup has an invalid companion name.')
  if (source.weightGoal !== undefined && source.weightGoal !== null) {
    if (!record(source.weightGoal) || !finite(source.weightGoal.targetKg) || !finite(source.weightGoal.baselineKg) || !finite(source.weightGoal.closestKg) || !finite(source.weightGoal.awardedSteps)) throw new Error('This backup has an invalid weight goal.')
  }
  if ((source.equippedOutfit !== undefined && source.equippedOutfit !== null && typeof source.equippedOutfit !== 'string') || (source.equippedDecor !== undefined && source.equippedDecor !== null && typeof source.equippedDecor !== 'string')) throw new Error('This backup has invalid room choices.')
  return normalizeJournal({ ...source, entries } as unknown as JournalState)
}

export async function exportJournal(state: JournalState): Promise<void> {
  const entries = await Promise.all(state.entries.map(async ({ photo, ...entry }) => ({ ...entry, photo: photo ? await blobAsDataUrl(photo) : undefined })))
  const payload = JSON.stringify({ format: 'yukun-local-export', version: 1, exportedAt: new Date().toISOString(), journal: { ...state, entries } }, null, 2)
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `yukun-journal-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
