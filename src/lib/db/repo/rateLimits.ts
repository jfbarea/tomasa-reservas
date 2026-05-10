import { query } from '../pool'

export const rateLimitsRepo = {
  async count(bucket: string, key: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs).toISOString()
    const rows = await query<{ count: string }>(
      'SELECT COUNT(*)::int as count FROM rate_limits WHERE bucket = $1 AND key = $2 AND ts > $3',
      [bucket, key, since],
    )
    return Number(rows[0]?.count ?? 0)
  },

  async record(bucket: string, key: string): Promise<void> {
    const now = new Date(Date.now()).toISOString()
    await query('INSERT INTO rate_limits (bucket, key, ts) VALUES ($1, $2, $3)', [bucket, key, now])
  },

  async cleanup(bucket: string, windowMs: number): Promise<void> {
    const since = new Date(Date.now() - windowMs).toISOString()
    await query('DELETE FROM rate_limits WHERE bucket = $1 AND ts < $2', [bucket, since])
  },
}
