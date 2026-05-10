import { query } from '../pool'
import type { BookingEvent, BookingStatus } from '@/types'

export const eventsRepo = {
  async record(
    bookingId: string,
    fromStatus: BookingStatus | null,
    toStatus: BookingStatus,
    actor: string,
  ): Promise<void> {
    await query(
      `INSERT INTO booking_events (id, booking_id, from_status, to_status, actor, at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
      [bookingId, fromStatus, toStatus, actor],
    )
  },

  async findByBooking(bookingId: string): Promise<BookingEvent[]> {
    return query<BookingEvent>(
      'SELECT * FROM booking_events WHERE booking_id = $1 ORDER BY at',
      [bookingId],
    )
  },
}
