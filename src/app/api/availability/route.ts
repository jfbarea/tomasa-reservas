export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { bookingRepo } from '@/lib/db/repo/bookings'
import { blocksRepo } from '@/lib/db/repo/blocks'
import { addDays, format, parseISO, isWithinInterval } from 'date-fns'
import type { AvailabilityDay } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'Parámetros from y to requeridos' }, { status: 400 })
  }

  const fromDate = parseISO(from)
  const toDate = parseISO(to)

  const [bookings, blocks] = await Promise.all([
    bookingRepo.findOverlapping(from, to),
    blocksRepo.findOverlapping(from, to),
  ])

  const days: AvailabilityDay[] = []
  let current = fromDate

  while (current <= toDate) {
    const dateStr = format(current, 'yyyy-MM-dd')
    let status: AvailabilityDay['status'] = 'available'

    const isBooked = bookings.some((b) =>
      isWithinInterval(current, {
        start: parseISO(b.start_date),
        end: addDays(parseISO(b.end_date), -1),
      }),
    )
    const isBlocked = blocks.some((b) =>
      isWithinInterval(current, {
        start: parseISO(b.start_date),
        end: addDays(parseISO(b.end_date), -1),
      }),
    )

    if (isBooked) status = 'booked'
    else if (isBlocked) status = 'blocked'

    days.push({ date: dateStr, status })
    current = addDays(current, 1)
  }

  return NextResponse.json(days)
}
