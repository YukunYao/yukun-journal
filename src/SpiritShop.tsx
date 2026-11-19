import { useState, type FormEvent } from 'react'
import { buySeedItem, equipSeedItem, seedBalance, seedCatalog, setWeightGoal, type JournalState, type SeedItemId, type WeightUnit } from './domain'

export function SpiritShop({ journal, onCommit, onNotice, onGoalReward }: { journal: JournalState; onCommit: (state: JournalState) => Promise<void>; onNotice: (message: string) => void; onGoalReward: (amount: number, balance: number) => void }) {
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState<WeightUnit>('kg')
  const [busy, setBusy] = useState(false)
  const run = async (next: () => JournalState, message: string) => {
    setBusy(true)
    try { await onCommit(next()); onNotice(message) }
    catch (error) { onNotice(error instanceof Error ? error.message : 'Could not save your change.') }
    finally { setBusy(false) }
  }
  const changeItem = (id: SeedItemId) => {
    const item = seedCatalog.find((candidate) => candidate.id === id)!
    const owned = (journal.seedUnlocks ?? []).some((unlock) => unlock.itemId === id)
    const equipped = item.category === 'outfit' ? journal.equippedOutfit === id : journal.equippedDecor === id
    if (!owned) return run(() => equipSeedItem(buySeedItem(journal, id), id, item.category), `${item.name} is yours and ready to wear.`)
    return run(() => equipSeedItem(journal, equipped ? null : id, item.category), equipped ? `${item.name} put away.` : `${item.name} added to your room.`)
  }
  const saveGoal = (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    void (async () => {
      try {
        const next = setWeightGoal(journal, Number(target), unit)
        await onCommit(next)
        const earned = seedBalance(next) - seedBalance(journal)
        if (earned > 0) onGoalReward(earned, seedBalance(next))
        else onNotice('Target saved. Future closer records can earn Light Seeds.')
      } catch (error) { onNotice(error instanceof Error ? error.message : 'Could not save your target.') }
      finally { setBusy(false) }
    })()
  }
  return <>
    <div className="seed-shop-heading"><p className="eyebrow">A little collection</p><span>{seedBalance(journal)} seeds to spend</span></div>
    <div className="seed-shop-list">{seedCatalog.map((item) => {
      const owned = (journal.seedUnlocks ?? []).some((unlock) => unlock.itemId === item.id)
      const equipped = item.category === 'outfit' ? journal.equippedOutfit === item.id : journal.equippedDecor === item.id
      return <article className="seed-shop-item" key={item.id}><img src={item.image} alt="" /><div><h2>{item.name}</h2><p>{item.category === 'outfit' ? 'A soft piece for your companion' : 'A warm detail for the room'}</p><small>{owned ? 'In your collection' : `${item.cost} Light Seeds`}</small></div><button type="button" disabled={busy || (!owned && seedBalance(journal) < item.cost)} onClick={() => void changeItem(item.id)}>{equipped ? 'Put away' : owned ? 'Use' : 'Unlock'}</button></article>
    })}</div>
    <section className="seed-goal" id="weight-goal"><div><p className="eyebrow">Optional weight goal</p><h2>Move toward your own number.</h2><p>Set a target in either direction. A new closest record earns 1 seed per 0.1 kg, up to 5 in a day. If you logged today before setting your first target, progress from your previous weigh-in can still count. Correcting today’s weight updates today’s Seeds. If the corrected balance cannot cover a recent unlock, that item becomes locked again. Older entries do not earn Seeds. Daily care entries can earn Seeds too.</p>{journal.weightGoal && <p className="goal-current">Current target: {(journal.weightGoal.targetKg * (unit === 'lb' ? 2.20462262 : 1)).toFixed(2)} {unit}</p>}</div><form onSubmit={saveGoal}><label>Target weight<input required type="number" min="1" step="0.01" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Your number" /></label><label>Unit<select value={unit} onChange={(event) => setUnit(event.target.value as WeightUnit)}><option value="kg">kg</option><option value="lb">lb</option></select></label><button className="button outline" disabled={busy}>Set target</button><p className="fine-print">Log a current weight first. With just one record, progress starts at your next weigh-in.</p></form></section>
  </>
}
