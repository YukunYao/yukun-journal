import type { JournalState, Entry } from './domain'
import { supabase } from './services'

type CloudEntry = Omit<Entry, 'photo'> & { photoPath?: string }
type CloudBody = Omit<JournalState, 'entries'> & { entries: CloudEntry[] }
export interface CloudJournal { state: JournalState; revision: number }

function client() {
  if (!supabase) throw new Error('Cloud service is not configured.')
  return supabase
}

export async function loadCloudJournal(userId: string): Promise<CloudJournal | null> {
  const db = client()
  const { data, error } = await db.from('journal_snapshots').select('revision, body').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const body = data.body as CloudBody
  const entries = await Promise.all(body.entries.map(async ({ photoPath, ...entry }) => {
    if (!photoPath) return entry
    if (!photoPath.startsWith(`${userId}/`)) throw new Error('Invalid photo path in cloud journal.')
    const photo = await db.storage.from('journal-photos').download(photoPath)
    if (photo.error) throw photo.error
    return { ...entry, photo: photo.data }
  }))
  return { state: { ...body, entries }, revision: data.revision }
}

export async function saveCloudJournal(userId: string, state: JournalState, expectedRevision: number): Promise<number> {
  const db = client()
  const entries: CloudEntry[] = []
  for (const { photo, ...entry } of state.entries) {
    if (!photo) { entries.push(entry); continue }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 10_485_760) throw new Error('Use a JPEG, PNG or WebP photo under 10 MB for cloud sync.')
    const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg'
    const digest = await crypto.subtle.digest('SHA-256', await photo.arrayBuffer())
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    const path = `${userId}/${entry.id}-${hash}.${extension}`
    const upload = await db.storage.from('journal-photos').upload(path, photo, { upsert: true, contentType: photo.type })
    if (upload.error) throw upload.error
    entries.push({ ...entry, photoPath: path })
  }
  const body: CloudBody = { ...state, entries }
  const { data, error } = await db.rpc('save_journal_snapshot', { expected_revision: expectedRevision, next_body: body })
  if (error) throw error
  return data as number
}
