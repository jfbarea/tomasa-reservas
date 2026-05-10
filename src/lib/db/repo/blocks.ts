import { query, queryOne } from '../pool'
import type { BlockedPeriod } from '@/types'

export const blocksRepo = {
  async findAll(): Promise<BlockedPeriod[]> {
    return query<BlockedPeriod>('SELECT * FROM blocked_periods ORDER BY start_date')
  },

  async findById(id: string): Promise<BlockedPeriod | null> {
    return queryOne<BlockedPeriod>('SELECT * FROM blocked_periods WHERE id = $1', [id])
  },

  async findOverlapping(startDate: string, endDate: string): Promise<BlockedPeriod[]> {
    return query<BlockedPeriod>(
      `SELECT * FROM blocked_periods
       WHERE daterange(start_date, end_date, '[)') && daterange($1::date, $2::date, '[)')`,
      [startDate, endDate],
    )
  },

  async create(data: { start_date: string; end_date: string; reason?: string }): Promise<BlockedPeriod> {
    const rows = await query<BlockedPeriod>(
      `INSERT INTO blocked_periods (id, start_date, end_date, reason)
       VALUES (gen_random_uuid(), $1, $2, $3)
       RETURNING *`,
      [data.start_date, data.end_date, data.reason ?? null],
    )
    return rows[0]
  },

  async delete(id: string): Promise<boolean> {
    const rows = await query('DELETE FROM blocked_periods WHERE id = $1 RETURNING id', [id])
    return rows.length > 0
  },
}
