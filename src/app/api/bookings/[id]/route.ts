export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { bookingRepo } from '@/lib/db/repo/bookings'
import { verifyJwt } from '@/lib/crypto'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 401 })

  try {
    const secret = process.env.BOOKING_TOKEN_SECRET ?? 'booking-secret-dev'
    const payload = await verifyJwt(token, secret)
    if (payload.bookingId !== params.id) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
  }

  const booking = await bookingRepo.findById(params.id)
  if (!booking) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ booking })
}
