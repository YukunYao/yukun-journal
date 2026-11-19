import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { JournalState } from './domain'
import { exportJournal, parseJournalExport } from './storage'
import './restore-journal.css'

interface Props {
  current: JournalState
  onRestore: (journal: JournalState) => Promise<void>
  onClose: () => void
}

export function RestoreJournalDialog({ current, onRestore, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState<JournalState | null>(null)
  const [filename, setFilename] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { dialog.current?.showModal() }, [])

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setSelected(null); setFilename(''); setConfirmed(false); setError('')
    if (!file) return
    try {
      const parsed = parseJournalExport(await file.text())
      setSelected(parsed); setFilename(file.name)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not read this backup.') }
  }
  const restore = async () => {
    if (!selected || !confirmed || busy) return
    setBusy(true); setError('')
    try { await onRestore(selected); dialog.current?.close(); onClose() }
    catch { setError('Could not save the restored journal. Your current browser journal is still here.') }
    finally { setBusy(false) }
  }
  const close = () => { if (!busy) { dialog.current?.close(); onClose() } }

  return <dialog ref={dialog} className="restore-dialog" onCancel={(event) => { if (busy) event.preventDefault(); else onClose() }} aria-labelledby="restore-title">
    <div className="restore-head"><p className="eyebrow">Your data</p><button className="text-button" type="button" onClick={close} aria-label="Close restore dialog">✕</button></div>
    <h2 id="restore-title">Restore a journal</h2>
    <p>Choose a YUKUN JSON backup. Review it before replacing the journal saved in this browser.</p>
    <label className="restore-picker">Choose backup file<input className="restore-file-input" type="file" accept=".json,application/json" onChange={choose} disabled={busy} /><span className="restore-file-button">Browse files <span aria-hidden="true">↗</span></span></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    {selected && <div className="restore-preview">
      <p className="restore-filename">{filename}</p>
      <div className="restore-compare"><div><span>Backup contains</span><strong>{selected.entries.length} entries · {selected.weights.length} weigh-ins</strong><small>{selected.entries.filter((entry) => entry.photo).length} photos · {selected.seedUnlocks.length} unlocked items</small></div><div><span>This browser has</span><strong>{current.entries.length} entries · {current.weights.length} weigh-ins</strong><small>{current.entries.filter((entry) => entry.photo).length} photos · {current.seedUnlocks.length} unlocked items</small></div></div>
      <p className="restore-warning">Restoring replaces this browser’s entire journal, including its Light Seeds, companion name, and room choices. It does not change a separate cloud journal.</p>
      {(current.entries.length > 0 || current.weights.length > 0 || current.seedUnlocks.length > 0) && <button className="text-button" type="button" onClick={async () => { try { await exportJournal(current) } catch { setError('Could not export your current copy. Please try again.') } }}>Export current copy first</button>}
      <label className="restore-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I understand this replaces the journal in this browser.</label>
    </div>}
    <div className="restore-actions"><button className="button outline" type="button" onClick={close} disabled={busy}>Cancel</button><button className="button primary" type="button" onClick={restore} disabled={!selected || !confirmed || busy}>{busy ? 'Restoring…' : 'Restore browser journal'}</button></div>
  </dialog>
}
