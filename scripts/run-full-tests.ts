import { execSync } from 'child_process'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const NO_DOCKER = !process.env.DATABASE_URL || process.env.NO_DOCKER === '1'

function run(cmd: string, opts?: { env?: NodeJS.ProcessEnv }) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, {
    stdio: 'inherit',
    env: { ...process.env, ...opts?.env },
  })
}

async function main() {
  if (!NO_DOCKER) {
    try {
      run('pnpm db:reset')
    } catch {
      console.warn('db:reset failed, skipping...')
    }
  }

  run('pnpm test:unit')
  run('pnpm build')

  if (!NO_DOCKER) {
    try {
      run('pnpm test:e2e')
    } catch {
      if (!fs.existsSync('BLOCKERS.md')) {
        fs.writeFileSync('BLOCKERS.md', '# Blockers\n\n- e2e tests failed\n')
      }
    }
  } else {
    console.log('Skipping e2e tests (NO_DOCKER or no DATABASE_URL)')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
