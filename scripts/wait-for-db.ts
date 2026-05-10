import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const timeout = 30000
const start = Date.now()

async function wait() {
  while (Date.now() - start < timeout) {
    try {
      await pool.query('SELECT 1')
      console.log('Database ready')
      process.exit(0)
    } catch {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  console.error('Timeout waiting for database')
  process.exit(1)
}

wait()
