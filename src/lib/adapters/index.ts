import type { CalendarPort } from '@/lib/ports/calendar'
import type { NotifyPort } from '@/lib/ports/notify'
import { inMemoryCalendar } from './inmemory/calendar'
import { inMemoryNotify } from './inmemory/telegram'

let realCalendar: CalendarPort | null = null
let realNotify: NotifyPort | null = null

async function loadReal() {
  if (!realCalendar) {
    const { realCalendar: rc } = await import('./real/google')
    const { realNotify: rn } = await import('./real/telegram')
    realCalendar = rc
    realNotify = rn
  }
}

export function getCalendar(): CalendarPort {
  if (process.env.ADAPTERS === 'real' && realCalendar) return realCalendar
  return inMemoryCalendar
}

export function getNotify(): NotifyPort {
  if (process.env.ADAPTERS === 'real' && realNotify) return realNotify
  return inMemoryNotify
}

export async function initAdapters(): Promise<void> {
  if (process.env.ADAPTERS === 'real') {
    await loadReal()
  }
}
