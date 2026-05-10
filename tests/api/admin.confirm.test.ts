import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Pool } from 'pg'
import { __events, __events as calEvents } from '@/lib/adapters/inmemory/calendar'
import { __inbox } from '@/lib/adapters/inmemory/telegram'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function adminReq(path: string) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'x-test-admin': '1' },
  }) as unknown as import('next/server').NextRequest
}

beforeEach(async () => {
  await pool.query('DELETE FROM booking_events')
  await pool.query('DELETE FROM bookings')
  __inbox.clear()
  __events.clear()
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

describe('POST /api/admin/bookings/:id/confirm', () => {
  it('confirms booking and creates calendar events', async () => {
    const id = await createPendingBooking()
    const { POST } = await import('@/app/api/admin/bookings/[id]/confirm/route')
    const res = await POST(adminReq(`/api/admin/bookings/${id}/confirm`), { params: { id } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.status).toBe('confirmed')
    expect(calEvents.get('fran')).toHaveLength(1)
    expect(calEvents.get('elisa')).toHaveLength(1)
  })

  it('sends confirmation email to guest', async () => {
    const id = await createPendingBooking()
    const { POST } = await import('@/app/api/admin/bookings/[id]/confirm/route')
    await POST(adminReq(`/api/admin/bookings/${id}/confirm`), { params: { id } })
    expect(__inbox.lastEmail()?.to).toBe('test@test.com')
  })

  it('returns 401 without admin header', async () => {
    const id = await createPendingBooking()
    const { POST } = await import('@/app/api/admin/bookings/[id]/confirm/route')
    const req = new Request(`http://localhost/api/admin/bookings/${id}/confirm`, {
      method: 'POST',
    }) as unknown as import('next/server').NextRequest
    const res = await POST(req, { params: { id } })
    expect(res.status).toBe(401)
  })
})
