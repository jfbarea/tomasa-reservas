export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { bookingRepo } from '@/lib/db/repo/bookings'
import { eventsRepo } from '@/lib/db/repo/events'
import { getCalendar, getNotify } from '@/lib/adapters'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const err = await requireAdmin(req)
  if (err) return err

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
  await bookingRepo.updateStatus(params.id, 'cancelled')
  await eventsRepo.record(params.id, fromStatus, 'cancelled', 'admin')

  const notify = getNotify()
  await notify.sendEmail({
    to: booking.guest_email,
    subject: 'Tu reserva ha sido cancelada',
    html: `<p>Hola ${booking.guest_name}, tu reserva del ${booking.start_date} al ${booking.end_date} ha sido cancelada.</p>`,
  })

  return NextResponse.json({ ok: true })
}
