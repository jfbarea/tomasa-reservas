import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Pool } from 'pg'
import { __inbox } from '@/lib/adapters/inmemory/telegram'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

beforeEach(async () => {
  await pool.query('DELETE FROM booking_events')
  await pool.query('DELETE FROM bookings')
  __inbox.clear()
})

afterAll(async () => {
  await pool.end()
})

async function createPendingBooking() {
  const { rows } = await pool.query<{ id: string }>(
    "INSERT INTO bookings (guest_name, guest_email, start_date, end_date, guests_count, status) VALUES ('Test', 'test@test.com', '2026-06-10', '2026-06-15', 2, 'pending') RETURNING id",
  )
  return rows[0].id
}

describe('POST /api/admin/bookings/:id/reject', () => {
  it('cancels booking and emails guest', async () => {
    const id = await createPendingBooking()
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
    expect(__inbox.lastEmail()?.to).toBe('test@test.com')
  })
})
