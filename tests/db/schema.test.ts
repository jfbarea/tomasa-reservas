import { describe, it, expect, afterAll } from 'vitest'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

afterAll(async () => {
  await pool.end()
})

describe('Schema validation', () => {
  it('has btree_gist extension', async () => {
    const { rows } = await pool.query(
      "SELECT extname FROM pg_extension WHERE extname = 'btree_gist'",
    )
    expect(rows[0]?.extname).toBe('btree_gist')
  })

  it('has bookings table with correct columns', async () => {
    const { rows } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'bookings'
    `)
    const cols = rows.map((r) => r.column_name)
    expect(cols).toContain('id')
    expect(cols).toContain('guest_name')
    expect(cols).toContain('guest_email')
    expect(cols).toContain('start_date')
    expect(cols).toContain('end_date')
    expect(cols).toContain('status')
    expect(cols).toContain('google_event_id_fran')
    expect(cols).toContain('google_event_id_elisa')
  })

  it('has bookings_no_overlap exclusion constraint', async () => {
    const { rows } = await pool.query(`
      SELECT conname FROM pg_constraint
      WHERE conname = 'bookings_no_overlap' AND contype = 'x'
    `)
    expect(rows).toHaveLength(1)
  })

  it('has blocked_periods_no_overlap exclusion constraint', async () => {
    const { rows } = await pool.query(`
      SELECT conname FROM pg_constraint
      WHERE conname = 'blocked_periods_no_overlap' AND contype = 'x'
    `)
    expect(rows).toHaveLength(1)
  })

  it('has booking_status enum type', async () => {
    const { rows } = await pool.query(
      "SELECT typname FROM pg_type WHERE typname = 'booking_status'",
    )
    expect(rows[0]?.typname).toBe('booking_status')
  })

  it('has bookings_no_block_overlap trigger', async () => {
    const { rows } = await pool.query(`
      SELECT tgname FROM pg_trigger WHERE tgname = 'bookings_no_block_overlap'
    `)
    expect(rows).toHaveLength(1)
  })

  it('has blocked_periods_no_booking_overlap trigger', async () => {
    const { rows } = await pool.query(`
      SELECT tgname FROM pg_trigger WHERE tgname = 'blocked_periods_no_booking_overlap'
    `)
    expect(rows).toHaveLength(1)
  })

  it('has all required tables', async () => {
    const { rows } = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `)
    const tables = rows.map((r) => r.table_name)
    expect(tables).toContain('bookings')
    expect(tables).toContain('blocked_periods')
    expect(tables).toContain('oauth_tokens')
    expect(tables).toContain('settings')
    expect(tables).toContain('booking_events')
    expect(tables).toContain('rate_limits')
  })
})
