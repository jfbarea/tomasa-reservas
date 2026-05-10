import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

beforeEach(async () => {
  await pool.query('DELETE FROM blocked_periods')
  await pool.query('DELETE FROM booking_events')
  await pool.query('DELETE FROM bookings')
})

afterAll(async () => {
  await pool.end()
})

function adminReq(path: string, method = 'GET', body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      'x-test-admin': '1',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import('next/server').NextRequest
}

describe('Admin blocks', () => {
  it('GET /api/admin/blocks returns blocks', async () => {
    const { GET } = await import('@/app/api/admin/blocks/route')
    const res = await GET(adminReq('/api/admin/blocks'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.blocks)).toBe(true)
  })

  it('POST /api/admin/blocks creates a block', async () => {
    const { POST } = await import('@/app/api/admin/blocks/route')
    const res = await POST(
      adminReq('/api/admin/blocks', 'POST', {
        start_date: '2026-07-01',
        end_date: '2026-07-05',
        reason: 'Vacaciones',
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.block.id).toBeTruthy()
  })

  it('DELETE /api/admin/blocks/:id deletes block', async () => {
    const { rows } = await pool.query<{ id: string }>(
      "INSERT INTO blocked_periods (start_date, end_date, reason) VALUES ('2026-08-01', '2026-08-05', 'Test') RETURNING id",
    )
    const id = rows[0].id

    const { DELETE } = await import('@/app/api/admin/blocks/[id]/route')
    const req = adminReq(`/api/admin/blocks/${id}`, 'DELETE')
    const res = await DELETE(req, { params: { id } })
    expect(res.status).toBe(200)
  })

  it('lists warnings when block overlaps existing booking', async () => {
    await pool.query(
      "INSERT INTO bookings (guest_name, guest_email, start_date, end_date, guests_count, status) VALUES ('Guest', 'g@test.com', '2026-09-10', '2026-09-15', 1, 'pending')",
    )
    const { POST } = await import('@/app/api/admin/blocks/route')
    const res = await POST(
      adminReq('/api/admin/blocks', 'POST', {
        start_date: '2026-09-12',
        end_date: '2026-09-20',
        reason: 'Test',
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.overlappingBookings.length).toBeGreaterThan(0)
  })
})
