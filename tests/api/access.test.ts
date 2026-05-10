import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Pool } from 'pg'
import { hashAccessCode } from '@/lib/crypto'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

beforeEach(async () => {
  await pool.query("DELETE FROM rate_limits WHERE bucket = 'access_fail'")
  const hash = await hashAccessCode('tomasa-dev')
  await pool.query(
    "INSERT INTO settings (key, value) VALUES ('access_code_hash', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [JSON.stringify(hash)],
  )
})

afterAll(async () => {
  await pool.end()
})

async function postAccess(code: string, headers: Record<string, string> = {}) {
  const { POST } = await import('@/app/api/access/route')
  const req = new Request('http://localhost/api/access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ code }),
  }) as unknown as import('next/server').NextRequest
  return POST(req)
}

describe('POST /api/access', () => {
  it('returns 200 with correct code', async () => {
    const res = await postAccess('tomasa-dev')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('returns 401 with wrong code', async () => {
    const res = await postAccess('wrong-code')
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('sets gh-access cookie on success', async () => {
    const res = await postAccess('tomasa-dev')
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toContain('gh-access')
    expect(setCookie).toContain('HttpOnly')
  })

  it('rate limits after 5 failures from same IP', async () => {
    const ip = '10.0.0.1'
    for (let i = 0; i < 5; i++) {
      await postAccess('wrong', { 'x-forwarded-for': ip })
    }
    const res = await postAccess('wrong', { 'x-forwarded-for': ip })
    expect(res.status).toBe(429)
  })
})
