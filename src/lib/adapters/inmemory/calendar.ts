import type { CalendarEvent, CalendarPort } from '@/lib/ports/calendar'

const store: Map<string, CalendarEvent[]> = new Map()

export const __events = {
  get(account: string): CalendarEvent[] {
    return store.get(account) ?? []
  },
  clear() {
    store.clear()
  },
}

export const inMemoryCalendar: CalendarPort = {
  async createEvent(account, event) {
    const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const e: CalendarEvent = { id, ...event }
    const list = store.get(account) ?? []
    list.push(e)
    store.set(account, list)
    return e
  },

  async deleteEvent(account, eventId) {
    const list = store.get(account) ?? []
    store.set(
      account,
      list.filter((e) => e.id !== eventId),
    )
  },
}
