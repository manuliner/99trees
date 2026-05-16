import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(__dirname, '..')
const dbPath = process.env.NUXT_SQLITE_DATABASE_PATH
  ? resolve(process.env.NUXT_SQLITE_DATABASE_PATH)
  : join(webRoot, 'server/database/db.sqlite')

if (existsSync(dbPath)) {
  unlinkSync(dbPath)
  console.log('Removed', dbPath)
}

mkdirSync(dirname(dbPath), { recursive: true })

const gen = spawnSync('pnpm', ['db:generate'], { cwd: webRoot, stdio: 'inherit', shell: true })
if (gen.status !== 0) process.exit(gen.status ?? 1)

const mig = spawnSync('pnpm', ['db:migrate'], { cwd: webRoot, stdio: 'inherit', shell: true })
if (mig.status !== 0) process.exit(mig.status ?? 1)

const seed = spawnSync('pnpm', ['db:seed'], { cwd: webRoot, stdio: 'inherit', shell: true })
process.exit(seed.status ?? 0)
