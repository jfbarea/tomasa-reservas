import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Pool } from 'pg'
import { signJwt } from '@/lib/crypto'
import { __inbox } from '@/lib/adapters/inmemory/telegram'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const ACCESS_SECRET = 'test-access-cookie-secret-32-chars-long-enough'

async function makeAccessCookie() {
  const token = await signJwt({ type: 'guest' }, ACCESS_SECRET, '30d')
  return `gh-access=${token}`
}

async function postBooking(body: unknown, cookie?: string) {
  const { POST } = await import('@/app/api/bookings/route')
  const req = new Request('http://localhost/api/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest
  return POST(req)
}

beforeEach(async () => {
  await pool.query('DELETE FROM booking_events')
  await pool.query('DELETE FROM bookings')
  await pool.query('DELETE FROM blocked_periods')
  await pool.query("DELETE FROM rate_limits WHERE bucket = 'booking_create'")
  __inbox.clear()
})

afterAll(async () => {
  await pool.end()
})

describe('POST /api/bookings', () => {
  it('requires access cookie', async () => {
    const res = await postBooking({
      guest_name: 'Test',
      guest_email: 'test@test.com',
      start_date: '2026-06-10',
      end_date: '2026-06-15',
      guests_count: 2,
    })
    expect(res.status).toBe(401)
  })

  it('creates booking with valid data', async () => {
    const cookie = await makeAccessCookie()
    const res = await postBooking(
      {
        guest_name: 'Ana García',
        guest_email: 'ana@example.com',
        start_date: '2026-06-10',
        end_date: '2026-06-15',
        guests_count: 2,
      },
      cookie,
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.id).toBeTruthy()
    expect(body.booking.status).toBe('pending')
    expect(body.token).toBeTruthy()
  })

  it('sends telegram notification on creation', async () => {
    const cookie = await makeAccessCookie()
    await postBooking(
      {
        guest_name: 'Test User',
        guest_email: 'test@test.com',
        start_date: '2026-06-10',
        end_date: '2026-06-12',
        guests_count: 1,
      },
      cookie,
    )
    expect(__inbox.lastTelegram()).toContain('Test User')
  })

  it('returns 422 for invalid data', async () => {
    const cookie = await makeAccessCookie()
    const res = await postBooking({ guest_name: 'x', guest_email: 'bad' }, cookie)
    expect(res.status).toBe(422)
  })

  it('returns 409 on overlap with existing booking', async () => {
    await pool.query(
      "INSERT INTO bookings (guest_name, guest_email, start_date, end_date, guests_count, status) VALUES ('First', 'first@test.com', '2026-06-10', '2026-06-15', 1, 'pending')",
    )
    const cookie = await makeAccessCookie()
    const res = await postBooking(
      {
        guest_name: 'Second',
        guest_email: 'second@test.com',
        start_date: '2026-06-12',
        end_date: '2026-06-18',
        guests_count: 1,
      },
      cookie,
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('overlap')
  })
})
