export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { confirmBooking } from '@/lib/booking/confirm'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const err = await requireAdmin(req)
  if (err) return err

  const booking = await confirmBooking(params.id)
  if (!booking) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ booking })
}
