export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { blocksRepo } from '@/lib/db/repo/blocks'
import { bookingRepo } from '@/lib/db/repo/bookings'
import { BlockSchema } from '@/lib/validation/booking'

export async function GET(req: NextRequest) {
  const err = await requireAdmin(req)
  if (err) return err

  const blocks = await blocksRepo.findAll()
  return NextResponse.json({ blocks })
}

export async function POST(req: NextRequest) {
  const err = await requireAdmin(req)
  if (err) return err

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }

  const parsed = BlockSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.issues }, { status: 422 })
  }

  const { start_date, end_date } = parsed.data
  if (start_date >= end_date) {
    return NextResponse.json({ error: 'La fecha fin debe ser posterior a la inicio' }, { status: 422 })
  }

  const overlappingBookings = await bookingRepo.findOverlapping(start_date, end_date)
  const block = await blocksRepo.create(parsed.data)

  return NextResponse.json({ block, overlappingBookings }, { status: 201 })
}
