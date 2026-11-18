export interface RewardEvent { id: string; amount: number; kind: 'journal' | 'goal'; balance: number }

export function RewardNotice({ reward, spiritName, onClose, onRoom }: { reward: RewardEvent; spiritName: string; onClose: () => void; onRoom: () => void }) {
  const cheer = reward.kind === 'goal' ? 'Good job!' : 'Well done!'
  return <section className="reward-notice" role="status" aria-live="polite" aria-label={`${spiritName || 'Your companion'} says ${cheer} ${reward.amount} Light Seeds earned. Balance ${reward.balance}.`}>
    <div className="reward-portrait"><img src="/assets/yukun-spirit-happy-v1.png" alt={`${spiritName || 'Your companion'} smiling and lifting a Light Seed`} /></div>
    <div className="reward-copy"><div className="reward-speech"><p className="reward-title">{cheer}</p><p className="reward-subtitle">{reward.kind === 'goal' ? 'One little step, at your pace.' : 'You made time for yourself today.'}</p></div><button className="reward-room-link" type="button" onClick={onRoom}>Visit the room <span aria-hidden="true">↗</span></button></div>
    <div className="reward-count"><svg viewBox="0 0 32 36" fill="none" aria-hidden="true"><path d="M16 33c-7.5 0-12-4.9-12-11.3C4 14.6 10.5 8.1 16 4c5.5 4.1 12 10.6 12 17.7C28 28.1 23.5 33 16 33Z" fill="#E9BA69" stroke="#A47741" strokeWidth="1.4"/><path d="M10 23c1.5 4 4.2 5.7 7.6 5.7M17 10c3.5 3.3 5.4 6.7 5.4 10.1" stroke="#FFF2D3" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 4c-.7-1.1-.8-2-.5-3" stroke="#8C956D" strokeWidth="1.6" strokeLinecap="round"/></svg><strong>+{reward.amount}</strong><span>Light Seeds</span></div>
    <button className="reward-close" type="button" aria-label="Dismiss Light Seeds notice" onClick={onClose}>×</button>
  </section>
}
