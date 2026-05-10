import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Pool } from 'pg'
import { signJwt } from '@/lib/crypto'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const ACCESS_SECRET = 'test-access-cookie-secret-32-chars-long-enough'

async function makeAccessCookie() {
  const token = await signJwt({ type: 'guest' }, ACCESS_SECRET, '30d')
  return `gh-access=${token}`
}

async function postBooking(body: unknown) {
  const { POST } = await import('@/app/api/bookings/route')
  const cookie = await makeAccessCookie()
  const req = new Request('http://localhost/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest
  return POST(req)
}

beforeEach(async () => {
  await pool.query('DELETE FROM booking_events')
  await pool.query('DELETE FROM bookings')
})

afterAll(async () => {
  await pool.end()
})

describe('Booking rules validation', () => {
  it('rejects insufficient notice (min_notice_days=3)', async () => {
    // today is 2026-06-01 (from fake timer), start_date 2026-06-02 is < 3 days
    const res = await postBooking({
      guest_name: 'Ana García',
      guest_email: 'ana@test.com',
      start_date: '2026-06-02',
      end_date: '2026-06-05',
      guests_count: 1,
    })
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.details?.some((e: { field: string }) => e.field === 'start_date')).toBe(true)
  })

  it('rejects stay exceeding max_stay_days (14)', async () => {
    const res = await postBooking({
      guest_name: 'Ana García',
      guest_email: 'ana@test.com',
      start_date: '2026-06-10',
      end_date: '2026-07-10',
      guests_count: 1,
    })
    expect(res.status).toBe(422)
  })

  it('rejects guests_count exceeding max_guests (4)', async () => {
    const res = await postBooking({
      guest_name: 'Ana García',
      guest_email: 'ana@test.com',
      start_date: '2026-06-10',
      end_date: '2026-06-15',
      guests_count: 10,
    })
    expect(res.status).toBe(422)
  })
})
