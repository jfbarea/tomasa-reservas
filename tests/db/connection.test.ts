import { describe, it, expect, afterAll } from 'vitest'
import * as dotenv from 'dotenv'
import { getPool, query } from '@/lib/db/pool'

dotenv.config({ path: '.env.test' })

afterAll(async () => {
  await getPool().end()
})

describe('Conexión a la base de datos', () => {
  it('responde a SELECT 1', async () => {
    const rows = await query<{ result: number }>('SELECT 1 AS result')
    expect(rows[0]?.result).toBe(1)
  })

  it('devuelve la versión de Postgres', async () => {
    const rows = await query<{ version: string }>('SELECT version()')
    expect(rows[0]?.version).toMatch(/PostgreSQL/)
  })

  it('el pool reutiliza la misma instancia', () => {
    const a = getPool()
    const b = getPool()
    expect(a).toBe(b)
  })
})
