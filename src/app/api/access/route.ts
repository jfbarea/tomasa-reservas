export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { settingsRepo } from '@/lib/db/repo/settings'
import { rateLimitsRepo } from '@/lib/db/repo/rateLimits'
import { verifyAccessCode } from '@/lib/crypto'
import { setAccessCookie } from '@/lib/auth/access'

const RATE_WINDOW = 10 * 60 * 1000
const RATE_LIMIT = 5

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'

  const failCount = await rateLimitsRepo.count('access_fail', ip, RATE_WINDOW)
  if (failCount >= RATE_LIMIT) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera 10 minutos.' }, { status: 429 })
  }

  let body: { code?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }

  const code = body.code?.trim()
  if (!code) {
    return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
  }

  const hash = await settingsRepo.get<string>('access_code_hash')
  if (!hash) {
    return NextResponse.json({ error: 'No configurado' }, { status: 500 })
  }

  const valid = await verifyAccessCode(code, hash)
  if (!valid) {
    await rateLimitsRepo.record('access_fail', ip)
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 401 })
  }

  await rateLimitsRepo.cleanup('access_fail', RATE_WINDOW)
  const response = NextResponse.json({ ok: true })
  await setAccessCookie(response)
  return response
}
