import { query, queryOne, withTransaction, getPool } from '../pool'
import type { Booking, BookingStatus } from '@/types'
import type { PoolClient } from 'pg'

export const bookingRepo = {
  async findAll(): Promise<Booking[]> {
    return query<Booking>('SELECT * FROM bookings ORDER BY start_date')
  },

  async findById(id: string): Promise<Booking | null> {
    return queryOne<Booking>('SELECT * FROM bookings WHERE id = $1', [id])
  },

  async findByStatus(status: BookingStatus): Promise<Booking[]> {
    return query<Booking>('SELECT * FROM bookings WHERE status = $1 ORDER BY start_date', [status])
  },

  async findUpcoming(): Promise<Booking[]> {
    return query<Booking>(
      "SELECT * FROM bookings WHERE status IN ('pending','confirmed') AND end_date > CURRENT_DATE ORDER BY start_date LIMIT 20",
    )
  },

  async findOverlapping(
    startDate: string,
    endDate: string,
    excludeId?: string,
  ): Promise<Booking[]> {
    const sql = excludeId
      ? `SELECT * FROM bookings WHERE status IN ('pending','confirmed') AND id != $3
         AND daterange(start_date, end_date, '[)') && daterange($1::date, $2::date, '[)')`
      : `SELECT * FROM bookings WHERE status IN ('pending','confirmed')
         AND daterange(start_date, end_date, '[)') && daterange($1::date, $2::date, '[)')`
    const params = excludeId ? [startDate, endDate, excludeId] : [startDate, endDate]
    return query<Booking>(sql, params)
  },

  async create(
    data: Omit<Booking, 'id' | 'created_at' | 'updated_at'>,
    client?: PoolClient,
  ): Promise<Booking> {
    const pool = getPool()
    const exec = client ? client.query.bind(client) : pool.query.bind(pool)
    const result = await exec(
      `INSERT INTO bookings (id, guest_name, guest_email, start_date, end_date, guests_count, notes, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.guest_name,
        data.guest_email,
        data.start_date,
        data.end_date,
        data.guests_count,
        data.notes ?? null,
        data.status,
      ],
    )
    return result.rows[0] as Booking
  },

  async updateStatus(
    id: string,
    status: BookingStatus,
    extra?: Partial<Booking>,
  ): Promise<Booking | null> {
    return withTransaction(async (client) => {
      const sets: string[] = ['status = $2', 'updated_at = NOW()']
      const params: unknown[] = [id, status]
      let i = 3
      if (extra) {
        for (const [k, v] of Object.entries(extra)) {
          sets.push(`${k} = $${i++}`)
          params.push(v)
        }
      }
      const result = await client.query(
        `UPDATE bookings SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
        params,
      )
      return (result.rows[0] as Booking) ?? null
    })
  },

  async cancel(id: string): Promise<Booking | null> {
    return this.updateStatus(id, 'cancelled')
  },
}
