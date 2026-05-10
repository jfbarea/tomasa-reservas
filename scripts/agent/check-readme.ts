import { readFileSync } from 'fs'
import { resolve } from 'path'

const REQUIRED_SECTIONS = [
  'Requisitos',
  'Quickstart',
  'Tests',
  'Configuración',
  'Activar producción',
  'Despliegue Netlify',
  'Estructura',
]

const readmePath = resolve(process.cwd(), 'README.md')
const content = readFileSync(readmePath, 'utf-8')

const missing: string[] = []
for (const section of REQUIRED_SECTIONS) {
  if (!content.includes(`## ${section}`) && !content.includes(`# ${section}`)) {
    missing.push(section)
  }
}

if (missing.length > 0) {
  console.error('README.md missing required sections:')
  for (const s of missing) console.error(`  - ${s}`)
  process.exit(1)
}

console.log(`README.md OK — all ${REQUIRED_SECTIONS.length} required sections present.`)
