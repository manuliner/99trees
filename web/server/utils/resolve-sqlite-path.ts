import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Nuxt app root (`web/`), stable regardless of `process.cwd()`. */
export function webRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
}

/** Resolve a path under the repo/web root (prefers existing locations). */
export function repoPath(...parts: string[]): string {
  const fromWeb = join(webRoot(), ...parts)
  if (existsSync(fromWeb)) return fromWeb
  const fromCwd = join(process.cwd(), ...parts)
  if (existsSync(fromCwd)) return fromCwd
  const fromCwdWeb = join(process.cwd(), 'web', ...parts)
  if (existsSync(fromCwdWeb)) return fromCwdWeb
  return fromWeb
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)
}

function resolveFromWebRoot(path: string): string {
  return isAbsolutePath(path) ? resolve(path) : resolve(webRoot(), path)
}

/**
 * SQLite file used by Nitro and CLI scripts. Env wins; then runtime config; then default under `web/server/database/`.
 */
export function resolveSqliteDatabasePath(configured?: string): string {
  const envPath = process.env.NUXT_SQLITE_DATABASE_PATH?.trim()
  if (envPath) return resolveFromWebRoot(envPath)

  const fromConfig = configured?.trim()
  if (fromConfig) return resolveFromWebRoot(fromConfig)

  const defaultPath = join(webRoot(), 'server', 'database', 'db.sqlite')
  if (existsSync(defaultPath)) return defaultPath

  // Fallback when cwd is repo root (`pnpm` from monorepo root).
  const fromCwdWeb = join(process.cwd(), 'web', 'server', 'database', 'db.sqlite')
  if (existsSync(fromCwdWeb)) return fromCwdWeb

  return defaultPath
}
