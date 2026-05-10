import { describe, it, expect } from 'vitest'
import { assertBookingRules } from '@/lib/rules'
import type { Settings } from '@/types'

const settings: Settings = {
  min_notice_days: 3,
  max_stay_days: 14,
  max_guests: 4,
}

const TODAY = new Date('2026-06-01T10:00:00Z')

describe('assertBookingRules', () => {
  it('passes a valid booking', () => {
    const errors = assertBookingRules(
      { start_date: '2026-06-10', end_date: '2026-06-15', guests_count: 2 },
      settings,
      TODAY,
    )
    expect(errors).toHaveLength(0)
  })

  it('rejects insufficient notice', () => {
    const errors = assertBookingRules(
      { start_date: '2026-06-02', end_date: '2026-06-05', guests_count: 1 },
      settings,
      TODAY,
    )
    expect(errors.some((e) => e.field === 'start_date')).toBe(true)
  })

  it('rejects end before start', () => {
    const errors = assertBookingRules(
      { start_date: '2026-06-15', end_date: '2026-06-10', guests_count: 1 },
      settings,
      TODAY,
    )
    expect(errors.some((e) => e.field === 'end_date')).toBe(true)
  })

  it('rejects stay too long', () => {
    const errors = assertBookingRules(
      { start_date: '2026-06-10', end_date: '2026-06-30', guests_count: 1 },
      settings,
      TODAY,
    )
    expect(errors.some((e) => e.field === 'end_date')).toBe(true)
  })

  it('rejects too many guests', () => {
    const errors = assertBookingRules(
      { start_date: '2026-06-10', end_date: '2026-06-15', guests_count: 10 },
      settings,
      TODAY,
    )
    expect(errors.some((e) => e.field === 'guests_count')).toBe(true)
  })
})
