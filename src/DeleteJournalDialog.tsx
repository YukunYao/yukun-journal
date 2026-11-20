import { useEffect, useRef, useState } from 'react'
import type { JournalState } from './domain'
import { exportJournal } from './storage'
import './restore-journal.css'
import './delete-journal.css'

export function DeleteJournalDialog({ journal, onDelete, onClose }: { journal: JournalState; onDelete: () => Promise<void>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { dialog.current?.showModal() }, [])
  const close = () => { if (!busy) { dialog.current?.close(); onClose() } }
  const remove = async () => {
    if (confirmation !== 'DELETE' || busy) return
    setBusy(true); setError('')
    try { await onDelete(); dialog.current?.close(); onClose() }
    catch { setError('Could not delete this browser’s journal. Your records are still here.') }
    finally { setBusy(false) }
  }
  return <dialog ref={dialog} className="restore-dialog delete-dialog" onCancel={(event) => { if (busy) event.preventDefault(); else onClose() }} aria-labelledby="delete-title">
    <div className="restore-head"><p className="eyebrow">This browser only</p><button className="text-button" type="button" onClick={close} aria-label="Close delete dialog">✕</button></div>
    <h2 id="delete-title">Delete this journal?</h2>
    <p>This will remove the journal stored in this browser: {journal.entries.length} {journal.entries.length === 1 ? 'entry' : 'entries'}, {journal.weights.length} {journal.weights.length === 1 ? 'weigh-in' : 'weigh-ins'}, photos, Light Seeds, your personal plan, and your companion’s room choices.</p>
    <p className="delete-scope">A separate cloud journal and your account will remain untouched. To recover this browser journal later, export a copy before deleting it.</p>
    <button className="text-button delete-export" type="button" disabled={busy} onClick={async () => { try { await exportJournal(journal) } catch { setError('Could not export a copy. Please try again before deleting.') } }}>Export a copy first</button>
    <label className="delete-confirm">Type DELETE to confirm<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" disabled={busy} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="restore-actions"><button className="button outline" type="button" onClick={close} disabled={busy}>Keep my journal</button><button className="button delete-action" type="button" onClick={remove} disabled={confirmation !== 'DELETE' || busy}>{busy ? 'Deleting…' : 'Delete browser journal'}</button></div>
  </dialog>
}
