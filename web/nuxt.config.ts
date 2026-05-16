import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const workspaceRoot = resolve(rootDir, '..')
const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8')) as { version?: string }

/** Docker defaults `NUXT_APP_VERSION` to 0.0.0; treat that as unset and use package.json. */
function resolveAppVersion(pkgVersion: string | undefined): string {
  const fromEnv =
    process.env.NUXT_APP_VERSION?.trim() || process.env.NUXT_PUBLIC_APP_VERSION?.trim() || ''
  const fromPkg = pkgVersion?.trim() || ''
  if (fromEnv && fromEnv !== '0.0.0') return fromEnv
  if (fromPkg) return fromPkg
  return fromEnv || '0.0.0'
}

export default defineNuxtConfig({
  srcDir: 'app',

  modules: ['@nuxt/ui', '@nuxt/eslint', '@pinia/nuxt', 'nuxt-auth-utils'],

  devtools: { enabled: true },

  app: {
    head: {
      title: 'Zugvögel',
      htmlAttrs: { lang: 'en' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  colorMode: { preference: 'light', fallback: 'light' },

  runtimeConfig: {
    sqliteDatabasePath: process.env.NUXT_SQLITE_DATABASE_PATH || './server/database/db.sqlite',
    sessionPassword: process.env.NUXT_SESSION_PASSWORD || 'change-me-in-production-at-least-32-chars',
    adminInitSecret: process.env.NUXT_ADMIN_INIT_SECRET || 'dev-init-secret',
    crewSessionPassword: process.env.NUXT_CREW_SESSION_PASSWORD || 'change-me-crew-session-32-chars-min',
    public: {
      appVersion: resolveAppVersion(pkg.version),
    },
  },

  compatibilityDate: '2025-01-01',

  nitro: {
    nodeModulesDirs: [resolve(rootDir, 'node_modules'), resolve(workspaceRoot, 'node_modules')],
    moduleSideEffects: ['better-sqlite3'],
  },

  alias: {
    '#shared': resolve(rootDir, 'shared'),
  },

  vite: {
    server: {
      fs: { allow: [rootDir, workspaceRoot] },
      watch: { ignored: ['**/*.db', '**/migrations/**'] },
    },
    resolve: {
      alias: { '#shared': resolve(rootDir, 'shared') },
    },
  },

  typescript: { strict: true },
})
