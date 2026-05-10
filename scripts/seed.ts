import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config()

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  const accessCode = process.env.SEED_ACCESS_CODE ?? 'tomasa-dev'
  const accessHash = await bcrypt.hash(accessCode, 12)

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin-dev'
  const adminHash = await bcrypt.hash(adminPassword, 12)

  try {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('access_code_hash', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(accessHash)],
    )
    console.log(`Seeded access_code_hash for code: ${accessCode}`)

    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('admin_password_hash', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(adminHash)],
    )
    console.log(`Seeded admin_password_hash for password: ${adminPassword}`)
  } finally {
    await pool.end()
  }
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
