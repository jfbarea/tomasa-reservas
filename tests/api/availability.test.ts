import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

beforeEach(async () => {
  await pool.query('DELETE FROM booking_events')
  await pool.query('DELETE FROM bookings')
  await pool.query('DELETE FROM blocked_periods')
})

afterAll(async () => {
  await pool.end()
})

async function getAvailability(from: string, to: string) {
  const { GET } = await import('@/app/api/availability/route')
  const req = new Request(`http://localhost/api/availability?from=${from}&to=${to}`) as unknown as import('next/server').NextRequest
  return GET(req)
}

describe('GET /api/availability', () => {
  it('returns only date and status fields', async () => {
    const res = await getAvailability('2026-06-10', '2026-06-12')
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    for (const day of body) {
      expect(Object.keys(day)).toEqual(expect.arrayContaining(['date', 'status']))
      expect(day.guest_name).toBeUndefined()
      expect(day.reason).toBeUndefined()
    }
  })

  it('marks booked days correctly', async () => {
    await pool.query(
      "INSERT INTO bookings (guest_name, guest_email, start_date, end_date, guests_count, status) VALUES ('Test', 'test@test.com', '2026-06-15', '2026-06-18', 1, 'confirmed')",
    )
    const res = await getAvailability('2026-06-14', '2026-06-19')
    const body = await res.json()
    const june15 = body.find((d: { date: string }) => d.date === '2026-06-15')
    expect(june15?.status).toBe('booked')
    const june14 = body.find((d: { date: string }) => d.date === '2026-06-14')
    expect(june14?.status).toBe('available')
    const june18 = body.find((d: { date: string }) => d.date === '2026-06-18')
    expect(june18?.status).toBe('available')
  })

  it('marks blocked days correctly', async () => {
    await pool.query(
      "INSERT INTO blocked_periods (start_date, end_date, reason) VALUES ('2026-07-01', '2026-07-05', 'Mantenimiento')",
    )
    const res = await getAvailability('2026-06-30', '2026-07-06')
    const body = await res.json()
    const july1 = body.find((d: { date: string }) => d.date === '2026-07-01')
    expect(july1?.status).toBe('blocked')
  })

  it('returns 400 without params', async () => {
    const { GET } = await import('@/app/api/availability/route')
    const req = new Request('http://localhost/api/availability') as unknown as import('next/server').NextRequest
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})
