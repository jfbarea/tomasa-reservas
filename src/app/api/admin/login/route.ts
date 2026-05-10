export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { settingsRepo } from '@/lib/db/repo/settings'
import { rateLimitsRepo } from '@/lib/db/repo/rateLimits'
import { verifyAccessCode } from '@/lib/crypto'
import { setAdminCookie } from '@/lib/auth/admin'

const RATE_WINDOW = 10 * 60 * 1000
const RATE_LIMIT = 5

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'

  const failCount = await rateLimitsRepo.count('admin_login_fail', ip, RATE_WINDOW)
  if (failCount >= RATE_LIMIT) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera 10 minutos.' }, { status: 429 })
  }

  let body: { password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }

  const password = body.password?.trim()
  if (!password) {
    return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 })
  }

  const hash = await settingsRepo.get<string>('admin_password_hash')
  if (!hash) {
    return NextResponse.json({ error: 'No configurado' }, { status: 500 })
  }

  const valid = await verifyAccessCode(password, hash)
  if (!valid) {
    await rateLimitsRepo.record('admin_login_fail', ip)
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  await rateLimitsRepo.cleanup('admin_login_fail', RATE_WINDOW)
  const response = NextResponse.json({ ok: true })
  await setAdminCookie(response)
  return response
}
