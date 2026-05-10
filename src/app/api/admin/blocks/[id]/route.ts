export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { blocksRepo } from '@/lib/db/repo/blocks'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const err = await requireAdmin(req)
  if (err) return err

  const deleted = await blocksRepo.delete(params.id)
  if (!deleted) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
