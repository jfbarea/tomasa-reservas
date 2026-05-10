import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Pool } from 'pg'
import { signJwt } from '@/lib/crypto'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const ACCESS_SECRET = 'test-access-cookie-secret-32-chars-long-enough'

afterAll(async () => {
  await pool.end()
})

beforeEach(async () => {
  await pool.query('DELETE FROM booking_events')
  await pool.query('DELETE FROM bookings')
  await pool.query('DELETE FROM blocked_periods')
})

async function postBooking(body: unknown) {
  const { POST } = await import('@/app/api/bookings/route')
  const token = await signJwt({ type: 'guest' }, ACCESS_SECRET, '30d')
  const req = new Request('http://localhost/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `gh-access=${token}` },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest
  return POST(req)
}

describe('Booking overlap: belt AND suspenders (GiST)', () => {
  it('prevents two overlapping bookings (application layer)', async () => {
    const res1 = await postBooking({
      guest_name: 'First Guest',
      guest_email: 'first@test.com',
      start_date: '2026-06-10',
      end_date: '2026-06-15',
      guests_count: 2,
    })
    expect(res1.status).toBe(201)

    const res2 = await postBooking({
      guest_name: 'Second Guest',
      guest_email: 'second@test.com',
      start_date: '2026-06-13',
      end_date: '2026-06-18',
      guests_count: 1,
    })
    expect(res2.status).toBe(409)
    const body = await res2.json()
    expect(body.error).toBe('overlap')
  })

  it('prevents booking overlapping a blocked period', async () => {
    await pool.query(
      "INSERT INTO blocked_periods (start_date, end_date, reason) VALUES ('2026-06-20', '2026-06-25', 'Mantenimiento')",
    )
    const res = await postBooking({
      guest_name: 'Test Guest',
      guest_email: 'test@test.com',
      start_date: '2026-06-22',
      end_date: '2026-06-27',
      guests_count: 1,
    })
    expect(res.status).toBe(409)
  })
})
