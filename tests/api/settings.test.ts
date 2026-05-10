import { describe, it, expect, afterAll } from 'vitest'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

afterAll(async () => {
  await pool.end()
})

function adminReq(method = 'GET', body?: unknown) {
  return new Request('http://localhost/api/admin/settings', {
    method,
    headers: {
      'x-test-admin': '1',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import('next/server').NextRequest
}

describe('Admin settings', () => {
  it('GET returns settings without access_code_hash', async () => {
    const { GET } = await import('@/app/api/admin/settings/route')
    const res = await GET(adminReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.settings.access_code_hash).toBeUndefined()
  })

  it('POST updates settings', async () => {
    const { POST } = await import('@/app/api/admin/settings/route')
    const res = await POST(adminReq('POST', { min_notice_days: 5 }))
    expect(res.status).toBe(200)

    const { rows } = await pool.query<{ value: unknown }>(
      "SELECT value FROM settings WHERE key = 'min_notice_days'",
    )
    expect(rows[0].value).toBe(5)
  })

  it('returns 401 without admin', async () => {
    const { GET } = await import('@/app/api/admin/settings/route')
    const req = new Request('http://localhost/api/admin/settings') as unknown as import('next/server').NextRequest
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
