import { describe, expect, it } from 'vitest'
import { addEntry, buySeedItem, emptyJournal, equipSeedItem, normalizeJournal, seedBalance, setWeightGoal, upsertWeight } from '../src/domain'
import { formatWeight } from '../src/presentation'

const day = new Date('2026-11-18T12:00:00')

describe('Light Seeds', () => {
  it('earns from distinct journal care and spends once', () => {
    const first = addEntry(emptyJournal(), { kind: 'meal', date: '2026-11-18', title: 'Lunch' }, day)
    const repeat = addEntry(first, { kind: 'meal', date: '2026-11-18', title: 'Dinner' }, day)
    expect(seedBalance(repeat)).toBe(10)
    const bought = buySeedItem(repeat, 'rose-scarf', day)
    expect(seedBalance(bought)).toBe(0)
    expect(equipSeedItem(bought, 'rose-scarf', 'outfit').equippedOutfit).toBe('rose-scarf')
    expect(() => buySeedItem(bought, 'rose-scarf', day)).toThrow('already yours')
    expect(() => buySeedItem(bought, 'blue-sleep-cap', day)).toThrow('Not enough')
    expect(() => equipSeedItem(repeat, 'blue-sleep-cap', 'outfit')).toThrow('Unlock')
  })

  it('rewards a new closest target record in either direction only once per day', () => {
    let state = upsertWeight(emptyJournal(), { date: '2026-11-17', value: 70, unit: 'kg' }, day)
    state = setWeightGoal(state, 68, 'kg')
    state = upsertWeight(state, { date: '2026-11-18', value: 69.8, unit: 'kg' }, day)
    expect(seedBalance(state)).toBe(2)
    state = upsertWeight(state, { date: '2026-11-18', value: 69.5, unit: 'kg' }, day)
    expect(seedBalance(state)).toBe(2)
    const nextDay = new Date('2026-11-19T12:00:00')
    state = upsertWeight(state, { date: '2026-11-19', value: 69.2, unit: 'kg' }, nextDay)
    expect(seedBalance(state)).toBe(7)
    state = upsertWeight(state, { date: '2026-11-20', value: 69.9, unit: 'kg' }, new Date('2026-11-20T12:00:00'))
    expect(seedBalance(state)).toBe(7)
    let gain = upsertWeight(emptyJournal(), { date: '2026-11-17', value: 60, unit: 'kg' }, day)
    gain = setWeightGoal(gain, 62, 'kg')
    gain = upsertWeight(gain, { date: '2026-11-18', value: 60.1, unit: 'kg' }, day)
    expect(seedBalance(gain)).toBe(1)
  })

  it('does not reward backfills and upgrades older local records', () => {
    const old = normalizeJournal({ entries: [], weights: [], seedLedger: [], spiritName: 'Pip' })
    expect(seedBalance(old)).toBe(0)
    expect(old.equippedOutfit).toBeNull()
    const transitional = normalizeJournal({ ...old, seedUnlocks: undefined, seedPurchases: [{ itemId: 'rose-scarf', cost: 10, unlockedAt: day.toISOString() }] } as unknown as typeof old)
    expect(transitional.seedUnlocks).toHaveLength(1)
    const record = upsertWeight(emptyJournal(), { date: '2026-11-17', value: 70, unit: 'kg' }, day)
    expect(seedBalance(record)).toBe(0)
  })

  it('keeps hundredths for weight records and user-set targets', () => {
    const state = upsertWeight(emptyJournal(), { date: '2026-11-18', value: 68.25, unit: 'kg' }, day)
    expect(state.weights[0].value).toBe(68.25)
    expect(formatWeight(state.weights[0].value, 'kg')).toBe('68.25 kg')
    expect(formatWeight(68, 'kg')).toBe('68.00 kg')
    expect(setWeightGoal(state, 65.75, 'kg').weightGoal?.targetKg).toBe(65.75)
    expect(() => upsertWeight(state, { date: '2026-11-18', value: 68.255, unit: 'kg' }, day)).toThrow('two decimal')
    expect(() => setWeightGoal(state, 65.755, 'kg')).toThrow('two decimal')
  })
})
