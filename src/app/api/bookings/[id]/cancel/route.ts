export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { bookingRepo } from '@/lib/db/repo/bookings'
import { eventsRepo } from '@/lib/db/repo/events'
import { getCalendar, getNotify } from '@/lib/adapters'
import { verifyJwt } from '@/lib/crypto'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Ya cancelada' }, { status: 409 })
  }

  const calendar = getCalendar()
  if (booking.google_event_id_fran) {
    try { await calendar.deleteEvent('fran', booking.google_event_id_fran) } catch { /* best effort */ }
  }
  if (booking.google_event_id_elisa) {
    try { await calendar.deleteEvent('elisa', booking.google_event_id_elisa) } catch { /* best effort */ }
  }

  const fromStatus = booking.status
  await bookingRepo.cancel(params.id)
  await eventsRepo.record(params.id, fromStatus, 'cancelled', 'guest')

  const notify = getNotify()

  await notify.sendEmail({
    to: booking.guest_email,
    subject: 'Reserva cancelada',
    html: `<p>Hola ${booking.guest_name}, tu reserva del ${booking.start_date} al ${booking.end_date} ha sido cancelada correctamente.</p>`,
  })

  await notify.sendTelegram(
    `Reserva cancelada por el guest: <b>${booking.guest_name}</b> — ${booking.start_date} → ${booking.end_date}`,
  )

  return NextResponse.json({ ok: true })
}
