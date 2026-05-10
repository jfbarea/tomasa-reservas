export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/auth/access'
import { settingsRepo } from '@/lib/db/repo/settings'
import { bookingRepo } from '@/lib/db/repo/bookings'
import { blocksRepo } from '@/lib/db/repo/blocks'
import { eventsRepo } from '@/lib/db/repo/events'
import { rateLimitsRepo } from '@/lib/db/repo/rateLimits'
import { assertBookingRules } from '@/lib/rules'
import { CreateBookingSchema } from '@/lib/validation/booking'
import { getNotify } from '@/lib/adapters'
import { signJwt } from '@/lib/crypto'
import { confirmBooking } from '@/lib/booking/confirm'

const RATE_WINDOW = 60 * 60 * 1000
const RATE_LIMIT = 10

export async function POST(req: NextRequest) {
  const err = await requireAccess(req)
  if (err) return err

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const failCount = await rateLimitsRepo.count('booking_create', ip, RATE_WINDOW)
  if (failCount >= RATE_LIMIT) {
    return NextResponse.json({ error: 'Demasiadas reservas. Intenta más tarde.' }, { status: 429 })
  }
  await rateLimitsRepo.record('booking_create', ip)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }

  const parsed = CreateBookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.issues }, { status: 422 })
  }

  const input = parsed.data
  const settings = await settingsRepo.getAll()
  const today = new Date()

  const ruleErrors = assertBookingRules(input, settings, today)
  if (ruleErrors.length > 0) {
    return NextResponse.json({ error: 'Validación fallida', details: ruleErrors }, { status: 422 })
  }

  const overlapping = await bookingRepo.findOverlapping(input.start_date, input.end_date)
  const blockedOverlap = await blocksRepo.findOverlapping(input.start_date, input.end_date)
  if (overlapping.length > 0 || blockedOverlap.length > 0) {
    return NextResponse.json({ error: 'overlap' }, { status: 409 })
  }

  let booking
  try {
    booking = await bookingRepo.create({ ...input, status: 'pending' })
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === '23P01') {
      return NextResponse.json({ error: 'overlap' }, { status: 409 })
    }
    throw e
  }

  await eventsRepo.record(booking.id, null, 'pending', 'guest')

  const notify = getNotify()
  const autoConfirm = settings.auto_confirm ?? false

  if (autoConfirm) {
    const confirmed = await confirmBooking(booking.id)
    if (confirmed) {
      booking = confirmed
    }
  }

  const tokenSecret = process.env.BOOKING_TOKEN_SECRET ?? 'booking-secret-dev'
  const bookingToken = await signJwt({ bookingId: booking.id }, tokenSecret, '60d')

  await notify.sendEmail({
    to: booking.guest_email,
    subject: autoConfirm ? 'Reserva confirmada' : 'Reserva recibida — pendiente de confirmación',
    html: `<p>Hola ${booking.guest_name}, tu reserva del ${booking.start_date} al ${booking.end_date} está ${autoConfirm ? 'confirmada' : 'pendiente de aprobación'}.</p>
           <p><a href="${process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'}/booking/${booking.id}?token=${bookingToken}">Ver reserva</a></p>`,
  })

  await notify.sendTelegram(
    `Nueva reserva${autoConfirm ? ' (confirmada)' : ''}: <b>${booking.guest_name}</b> — ${booking.start_date} → ${booking.end_date} (${booking.guests_count} pers.)`,
  )

  return NextResponse.json({ booking, token: bookingToken }, { status: 201 })
}
