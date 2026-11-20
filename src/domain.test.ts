import { describe, expect, it } from 'vitest'
import { addEntry, dailyMessage, emptyJournal, localDateKey, normalizeJournal, rangeStartDate, setPersonalPlan, upsertWeight } from './domain'

describe('journal rules', () => {
  it('saves a trimmed self-written plan and clears it when all sections are blank', () => {
    const now = new Date('2026-11-19T12:00:00.000Z')
    const saved = setPersonalPlan(emptyJournal(), { foodRhythm: '  Regular meals  ', movement: '', recovery: '  Rest  ', weeklyFocus: '  ' }, now)
    expect(saved.personalPlan).toEqual({ foodRhythm: 'Regular meals', movement: '', recovery: 'Rest', weeklyFocus: '', updatedAt: '2026-11-19T12:00:00.000Z' })
    expect(setPersonalPlan(saved, { foodRhythm: ' ', movement: '', recovery: '', weeklyFocus: '' }, now).personalPlan).toBeNull()
    expect(normalizeJournal({ entries: [], weights: [] }).personalPlan).toBeNull()
  })

  it('rejects an overlong self-written plan section', () => {
    expect(() => setPersonalPlan(emptyJournal(), { foodRhythm: 'a'.repeat(501), movement: '', recovery: '', weeklyFocus: '' })).toThrow(/500/)
  })
  it('uses the local calendar day instead of UTC', () => {
    expect(localDateKey(new Date(2026, 10, 16, 23, 30))).toBe('2026-11-16')
  })

  it('finds a calendar range start across a month boundary', () => {
    expect(rangeStartDate('2026-11-16', 30)).toBe('2026-10-17')
  })

  it('requires a user-entered meal name', () => {
    expect(() => addEntry(emptyJournal(), { kind: 'meal', date: '2026-11-16', title: '   ' }, new Date(2026, 10, 16))).toThrow()
  })

  it('awards only distinct eligible categories today, never past dates or edits', () => {
    const now = new Date(2026, 10, 16)
    let state = addEntry(emptyJournal(), { kind: 'meal', date: '2026-11-16', title: 'Lunch' }, now)
    expect(state.seedLedger.map((item) => item.amount)).toEqual([10])
    state = addEntry(state, { kind: 'meal', date: '2026-11-16', title: 'Dinner' }, now)
    state = addEntry(state, { kind: 'mood', date: '2026-11-16', title: 'Calm' }, now)
    state = addEntry(state, { kind: 'note', date: '2026-11-16', title: 'A note' }, now)
    state = addEntry(state, { kind: 'cycle', date: '2026-11-16', title: 'Period day' }, now)
    state = addEntry(state, { kind: 'movement', date: '2026-11-15', title: 'Walk' }, now)
    expect(state.seedLedger.map((item) => item.amount)).toEqual([10, 3, 3])
  })

  it('replaces rather than duplicates a weight on one date', () => {
    let state = upsertWeight(emptyJournal(), { date: '2026-11-16', value: 145, unit: 'lb' })
    state = upsertWeight(state, { date: '2026-11-16', value: 144, unit: 'lb' })
    expect(state.weights).toHaveLength(1)
    expect(state.weights[0].value).toBe(144)
    expect(state.weights[0].kg).toBeCloseTo(65.317)
  })

  it('keeps one authored companion line stable for the same day', () => {
    expect(dailyMessage(new Date(2026, 10, 16))).toBe(dailyMessage(new Date(2026, 10, 16, 23)))
  })
})
