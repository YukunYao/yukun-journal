import type { EntryKind } from './domain'

export const scene = '/assets/yukun-room-v2.png'

export const labels: Record<EntryKind, string> = {
  meal: 'Meal',
  movement: 'Movement',
  mood: 'Mood',
  cycle: 'Cycle',
  note: 'Note',
}

export const formatDate = (date: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }) =>
  new Intl.DateTimeFormat('en-US', options).format(new Date(`${date}T12:00:00`))
