import { signJwt, verifyJwt } from '@/lib/crypto'
import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'gh-access'
const SECRET = () => process.env.ACCESS_COOKIE_SECRET ?? 'dev-secret-change-me'

export async function setAccessCookie(response: NextResponse): Promise<void> {
  const token = await signJwt({ type: 'guest' }, SECRET(), '30d')
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
}

export async function verifyAccessCookie(req: NextRequest): Promise<boolean> {
  let token: string | undefined
  try {
    token = req.cookies.get(COOKIE_NAME)?.value
  } catch {
    token = undefined
  }
  // fallback: parse from Cookie header
  if (!token) {
    const cookieHeader = req.headers.get('cookie') ?? ''
    const match = cookieHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`))
    token = match?.[1]
  }
  if (!token) return false
  try {
    await verifyJwt(token, SECRET())
    return true
  } catch {
    return false
  }
}

export async function requireAccess(req: NextRequest): Promise<NextResponse | null> {
  const valid = await verifyAccessCookie(req)
  if (!valid) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return null
}
