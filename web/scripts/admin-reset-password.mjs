import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function resolveDbPath() {
  const envPath = process.env.NUXT_SQLITE_DATABASE_PATH?.trim()
  if (envPath) {
    return envPath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(envPath)
      ? resolve(envPath)
      : resolve(webRoot, envPath)
  }
  return resolve(webRoot, 'server/database/db.sqlite')
}

const password = process.argv[2] ?? 'test'
const dbPath = resolveDbPath()
const db = new Database(dbPath)

const admins = db.prepare('SELECT id, email FROM admin_users ORDER BY id').all()
if (admins.length === 0) {
  console.error(`No admin users in ${dbPath}`)
  process.exit(1)
}

const hash = await bcrypt.hash(password, 10)
const update = db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?')
for (const admin of admins) {
  update.run(hash, admin.id)
  console.log(`Updated admin #${admin.id} (${admin.email})`)
}
console.log(`Database: ${dbPath}`)
console.log(`Password: ${password}`)
