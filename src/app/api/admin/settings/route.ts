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

  const contentType = req.headers.get('content-type') ?? ''
  let body: Record<string, unknown>
  const isJson = contentType.includes('application/json')

  if (isJson) {
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
    }
  } else {
    const fd = await req.formData()
    body = Object.fromEntries(fd.entries())
    // Unchecked checkboxes are absent from form data; treat absence as false
    body.auto_confirm = fd.has('auto_confirm')
  }

  // Coerce numeric string values coming from HTML forms
  for (const field of ['min_notice_days', 'max_stay_days', 'max_guests']) {
    if (field in body && typeof body[field] === 'string') {
      body[field] = parseInt(body[field] as string, 10)
    }
  }
  if ('auto_confirm' in body && typeof body.auto_confirm !== 'boolean') {
    body.auto_confirm = body.auto_confirm === 'on' || body.auto_confirm === 'true'
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

  if (!isJson) {
    return NextResponse.redirect(new URL('/admin/settings', req.url), 303)
  }
  return NextResponse.json({ ok: true })
}
