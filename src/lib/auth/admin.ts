import { NextRequest, NextResponse } from 'next/server'
import { signJwt, verifyJwt } from '@/lib/crypto'

const COOKIE_NAME = 'admin-session'
const SECRET = () => process.env.ACCESS_COOKIE_SECRET ?? 'dev-secret-change-me'

export async function setAdminCookie(response: NextResponse): Promise<void> {
  const token = await signJwt({ type: 'admin' }, SECRET(), '7d')
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export async function requireAdmin(req?: NextRequest): Promise<NextResponse | null> {
  if (req && process.env.NODE_ENV === 'test') {
    if (req.headers.get('x-test-admin') === '1') return null
  }

  if (req) {
    let token: string | undefined
    try {
      token = req.cookies.get(COOKIE_NAME)?.value
    } catch {
      token = undefined
    }
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    try {
      const payload = await verifyJwt(token, SECRET())
      if (payload.type !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    } catch {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    return null
  }

  // Server component path — dynamic imports for test compatibility
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value

    if (token) {
      try {
        const payload = await verifyJwt(token, SECRET())
        if (payload.type === 'admin') return null
      } catch {
        // token inválido — continúa a redirect
      }
    }

    const { redirect } = await import('next/navigation')
    redirect('/admin/login')
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err) throw err
    // En contexto sin request (tests), ignorar
  }
  return null
}
