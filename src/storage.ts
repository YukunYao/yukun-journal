import { emptyJournal, type JournalState } from './domain'

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
      request.onsuccess = () => resolve((request.result as JournalState | undefined) ?? emptyJournal())
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

function blobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not include a photo in the export.'))
    reader.readAsDataURL(blob)
  })
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
