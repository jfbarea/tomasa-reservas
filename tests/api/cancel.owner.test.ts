import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Pool } from 'pg'
import { signJwt } from '@/lib/crypto'
import { __inbox } from '@/lib/adapters/inmemory/telegram'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const BOOKING_SECRET = 'test-booking-token-secret-32-chars-long-enough'

beforeEach(async () => {
  await pool.query('DELETE FROM booking_events')
  await pool.query('DELETE FROM bookings')
  __inbox.clear()
})

afterAll(async () => {
  await pool.end()
})

async function createBooking(status = 'confirmed') {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO bookings (guest_name, guest_email, start_date, end_date, guests_count, status)
     VALUES ('Test', 'test@test.com', '2026-06-10', '2026-06-15', 1, $1) RETURNING id`,
    [status],
  )
  return rows[0].id
}

describe('POST /api/bookings/:id/cancel (owner via reject endpoint)', () => {
  it('admin can cancel via reject endpoint', async () => {
    const id = await createBooking('pending')
    const { POST } = await import('@/app/api/admin/bookings/[id]/reject/route')
    const req = new Request(`http://localhost/api/admin/bookings/${id}/reject`, {
      method: 'POST',
      headers: { 'x-test-admin': '1' },
    }) as unknown as import('next/server').NextRequest
    const res = await POST(req, { params: { id } })
    expect(res.status).toBe(200)

    const { rows } = await pool.query<{ status: string }>(
      'SELECT status FROM bookings WHERE id = $1',
      [id],
    )
    expect(rows[0].status).toBe('cancelled')
  })

  it('guest can cancel confirmed booking with valid token', async () => {
    const id = await createBooking('confirmed')
    const token = await signJwt({ bookingId: id }, BOOKING_SECRET, '60d')

    const { POST } = await import('@/app/api/bookings/[id]/cancel/route')
    const req = new Request(`http://localhost/api/bookings/${id}/cancel?token=${token}`, {
      method: 'POST',
    }) as unknown as import('next/server').NextRequest
    const res = await POST(req, { params: { id } })
    expect(res.status).toBe(200)
  })
})
