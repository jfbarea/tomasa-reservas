export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { bookingRepo } from '@/lib/db/repo/bookings'
import { eventsRepo } from '@/lib/db/repo/events'
import { getNotify } from '@/lib/adapters'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const err = await requireAdmin(req)
  if (err) return err

  const booking = await bookingRepo.findById(params.id)
  if (!booking) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await bookingRepo.updateStatus(params.id, 'cancelled')
  await eventsRepo.record(params.id, booking.status, 'cancelled', 'admin')

  const notify = getNotify()

  await notify.sendEmail({
    to: booking.guest_email,
    subject: 'Tu reserva no ha sido aprobada',
    html: `<p>Hola ${booking.guest_name}, lamentablemente no podemos confirmar tu reserva del ${booking.start_date} al ${booking.end_date}.</p>`,
  })

  await notify.sendTelegram(
    `Reserva rechazada: <b>${booking.guest_name}</b> — ${booking.start_date} → ${booking.end_date}`,
  )

  return NextResponse.json({ ok: true })
}
