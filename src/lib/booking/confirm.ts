import { bookingRepo } from '@/lib/db/repo/bookings'
import { eventsRepo } from '@/lib/db/repo/events'
import { getCalendar, getNotify } from '@/lib/adapters'
import { signJwt } from '@/lib/crypto'
import type { Booking } from '@/types'

export async function confirmBooking(bookingId: string): Promise<Booking | null> {
  const booking = await bookingRepo.findById(bookingId)
  if (!booking) return null

  const calendar = getCalendar()
  const event = {
    title: `Visita: ${booking.guest_name} (${booking.guests_count} pers.)`,
    description: `${booking.notes ?? ''}\n${booking.guest_email}`.trim(),
    startDate: booking.start_date,
    endDate: booking.end_date,
  }

  let franEventId: string | null = null
  let elisaEventId: string | null = null

  try {
    const franEvent = await calendar.createEvent('fran', event)
    franEventId = franEvent.id

    const elisaEvent = await calendar.createEvent('elisa', event)
    elisaEventId = elisaEvent.id
  } catch (err) {
    if (franEventId) {
      try {
        await calendar.deleteEvent('fran', franEventId)
      } catch {
        // best effort
      }
    }
    const updated = await bookingRepo.updateStatus(bookingId, 'pending', {
      google_event_id_fran: null,
      google_event_id_elisa: null,
    } as Partial<Booking>)
    return updated
  }

  const confirmed = await bookingRepo.updateStatus(bookingId, 'confirmed', {
    google_event_id_fran: franEventId,
    google_event_id_elisa: elisaEventId,
  } as Partial<Booking>)

  await eventsRepo.record(bookingId, 'pending', 'confirmed', 'system')

  if (confirmed) {
    const tokenSecret = process.env.BOOKING_TOKEN_SECRET ?? 'booking-secret-dev'
    const cancelToken = await signJwt({ bookingId, action: 'cancel' }, tokenSecret, '60d')
    await bookingRepo.updateStatus(bookingId, 'confirmed', { cancel_token: cancelToken } as Partial<Booking>)

    const notify = getNotify()
    const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'
    await notify.sendEmail({
      to: confirmed.guest_email,
      subject: 'Tu visita está confirmada',
      html: `<p>Hola ${confirmed.guest_name}, tu visita del ${confirmed.start_date} al ${confirmed.end_date} está confirmada.</p>
             <p>Si necesitas cancelar: <a href="${baseUrl}/booking/${confirmed.id}?token=${cancelToken}">Cancelar reserva</a></p>`,
    })
  }

  return confirmed
}
