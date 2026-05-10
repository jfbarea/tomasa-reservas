export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { settingsRepo } from '@/lib/db/repo/settings'

export async function GET(req: NextRequest) {
  const err = await requireAdmin(req)
  if (err) return err

  const settings = await settingsRepo.getAll()
  const safe = { ...settings, access_code_hash: undefined }
  return NextResponse.json({ settings: safe })
}

export async function POST(req: NextRequest) {
  const err = await requireAdmin(req)
  if (err) return err

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }

  const allowed = ['auto_confirm', 'min_notice_days', 'max_stay_days', 'max_guests']
  for (const key of allowed) {
    if (key in body) {
      await settingsRepo.set(key, body[key])
    }
  }

  if (body.access_code && typeof body.access_code === 'string') {
    const { hashAccessCode } = await import('@/lib/crypto')
    await settingsRepo.set('access_code_hash', await hashAccessCode(body.access_code))
  }

  if (body.admin_password && typeof body.admin_password === 'string') {
    const { hashAccessCode } = await import('@/lib/crypto')
    await settingsRepo.set('admin_password_hash', await hashAccessCode(body.admin_password))
  }

  return NextResponse.json({ ok: true })
}
