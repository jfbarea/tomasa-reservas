import { query, queryOne } from '../pool'
import type { Settings } from '@/types'

export const settingsRepo = {
  async getAll(): Promise<Settings> {
    const rows = await query<{ key: string; value: unknown }>('SELECT key, value FROM settings')
    const result: Record<string, unknown> = {}
    for (const row of rows) {
      result[row.key] = row.value
    }
    return result as unknown as Settings
  },

  async get<T = unknown>(key: string): Promise<T | null> {
    const row = await queryOne<{ value: T }>('SELECT value FROM settings WHERE key = $1', [key])
    return row?.value ?? null
  },

  async set(key: string, value: unknown): Promise<void> {
    await query(
      `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, JSON.stringify(value)],
    )
  },

  async setMany(settings: Partial<Settings>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.set(key, value)
    }
  },
}
