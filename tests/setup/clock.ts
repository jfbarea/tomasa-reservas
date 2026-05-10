import { beforeEach, afterEach, vi } from 'vitest'

const FIXED_DATE = new Date('2026-06-01T10:00:00Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_DATE)
})

afterEach(() => {
  vi.useRealTimers()
})
