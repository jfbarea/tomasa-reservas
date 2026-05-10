import { describe, it, expect } from 'vitest'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

describe('Google OAuth endpoints', () => {
  it('GET /api/admin/google/connect/fran requires admin', async () => {
    const { GET } = await import('@/app/api/admin/google/connect/[account]/route')
    const req = new Request('http://localhost/api/admin/google/connect/fran') as unknown as import('next/server').NextRequest
    const res = await GET(req, { params: { account: 'fran' } })
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/google/connect/invalid returns 400', async () => {
    const { GET } = await import('@/app/api/admin/google/connect/[account]/route')
    const req = new Request('http://localhost/api/admin/google/connect/invalid', {
      headers: { 'x-test-admin': '1' },
    }) as unknown as import('next/server').NextRequest
    const res = await GET(req, { params: { account: 'invalid' } })
    expect(res.status).toBe(400)
  })

  it('GET /api/admin/google/connect/fran with admin redirects to Google', async () => {
    const { GET } = await import('@/app/api/admin/google/connect/[account]/route')
    const req = new Request('http://localhost/api/admin/google/connect/fran', {
      headers: { 'x-test-admin': '1' },
    }) as unknown as import('next/server').NextRequest
    const res = await GET(req, { params: { account: 'fran' } })
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('accounts.google.com')
  })
})
