import { describe, expect, it } from 'vitest'
import { emptyJournal } from './domain'
import { parseJournalExport } from './storage'

const wrap = (journal: unknown) => JSON.stringify({ format: 'yukun-local-export', version: 1, exportedAt: '2026-11-19T12:00:00.000Z', journal })

describe('journal backup restore', () => {
  it('restores records, rewards, and embedded photos', () => {
    const journal = {
      ...emptyJournal(),
      spiritName: 'Pip',
      entries: [{ id: 'meal-1', kind: 'meal', date: '2026-11-18', title: 'Soup', createdAt: '2026-11-18T12:00:00Z', updatedAt: '2026-11-18T12:00:00Z', photo: 'data:image/png;base64,aGVsbG8=' }],
      weights: [{ date: '2026-11-18', value: 58.25, unit: 'kg', kg: 58.25, updatedAt: '2026-11-18T12:00:00Z' }],
      seedLedger: [{ date: '2026-11-18', kind: 'meal', amount: 10 }],
      seedUnlocks: [{ itemId: 'rose-scarf', cost: 10, unlockdAt: '2026-11-18T12:00:00Z' }],
    }
    const restored = parseJournalExport(wrap(journal))
    expect(restored.spiritName).toBe('Pip')
    expect(restored.weights[0].value).toBe(58.25)
    expect(restored.seedUnlocks[0].itemId).toBe('rose-scarf')
    expect(restored.entries[0].photo).toBeInstanceOf(Blob)
    expect(restored.entries[0].photo?.type).toBe('image/png')
    expect(restored.entries[0].photo?.size).toBe(5)
  })

  it('rejects unrelated or unsupported files instead of replacing the journal with empty data', () => {
    expect(() => parseJournalExport('{}')).toThrow(/YUKUN backup/i)
    expect(() => parseJournalExport(JSON.stringify({ format: 'yukun-local-export', version: 2, journal: emptyJournal() }))).toThrow(/version/i)
    expect(() => parseJournalExport(wrap({ entries: 'not-an-array', weights: [] }))).toThrow(/entries/i)
  })

  it('rejects broken records and photo data', () => {
    expect(() => parseJournalExport(wrap({ ...emptyJournal(), weights: [{ date: '2026-11-18', value: '58', unit: 'kg', kg: 58 }] }))).toThrow(/weight/i)
    expect(() => parseJournalExport(wrap({ ...emptyJournal(), entries: [{ id: 'x', kind: 'meal', date: '2026-11-18', title: 'Soup', createdAt: '2026-11-18T12:00:00Z', updatedAt: '2026-11-18T12:00:00Z', photo: 'https://example.com/photo' }] }))).toThrow(/photo/i)
  })
})
