import { describe, it, expect } from 'vitest'
import { CreateBookingSchema } from '@/lib/validation/booking'

describe('CreateBookingSchema', () => {
  const valid = {
    guest_name: 'Ana García',
    guest_email: 'ana@example.com',
    start_date: '2026-06-10',
    end_date: '2026-06-15',
    guests_count: 2,
    notes: 'Llego tarde',
  }

  it('accepts valid input', () => {
    const result = CreateBookingSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects short name', () => {
    const result = CreateBookingSchema.safeParse({ ...valid, guest_name: 'A' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = CreateBookingSchema.safeParse({ ...valid, guest_email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid date format', () => {
    const result = CreateBookingSchema.safeParse({ ...valid, start_date: '10/06/2026' })
    expect(result.success).toBe(false)
  })

  it('rejects notes too long', () => {
    const result = CreateBookingSchema.safeParse({ ...valid, notes: 'x'.repeat(1001) })
    expect(result.success).toBe(false)
  })

  it('accepts missing notes', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { notes: _notes, ...noNotes } = valid
    const result = CreateBookingSchema.safeParse(noNotes)
    expect(result.success).toBe(true)
  })
})
