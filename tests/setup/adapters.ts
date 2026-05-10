import { beforeEach } from 'vitest'
import { __inbox } from '@/lib/adapters/inmemory/telegram'
import { __events as __calEvents } from '@/lib/adapters/inmemory/calendar'

beforeEach(() => {
  __inbox.clear()
  __calEvents.clear()
})

export function lastTelegram() {
  return __inbox.lastTelegram()
}

export function lastEmail() {
  return __inbox.lastEmail()
}

export function googleEvents(account: string) {
  return __calEvents.get(account)
}
