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

  modules: ['@nuxt/ui', '@nuxt/eslint', '@pinia/nuxt', 'nuxt-auth-utils', '@nuxtjs/i18n'],

  devtools: { enabled: true },

  app: {
    head: {
      title: 'Zugvögel',
      htmlAttrs: {},
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
    metricsEnabled: process.env.NUXT_METRICS_ENABLED === 'true',
    metricsToken: process.env.NUXT_METRICS_TOKEN,
    public: {
      appVersion: resolveAppVersion(pkg.version),
    },
  },

  compatibilityDate: '2025-01-01',

  sourcemap: { server: false },

  nitro: {
    nodeModulesDirs: [resolve(rootDir, 'node_modules'), resolve(workspaceRoot, 'node_modules')],
    moduleSideEffects: ['better-sqlite3'],
    routeRules: {
      '/api/turns/**/submission': {
        headers: { 'x-upload-limit': '22mb' },
      },
      ...(process.env.NODE_ENV === 'production'
        ? {
            '/**': {
              headers: {
                'X-Frame-Options': 'DENY',
                'X-Content-Type-Options': 'nosniff',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
                'Content-Security-Policy': [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-inline'",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: blob:",
                  "media-src 'self' blob:",
                  "connect-src 'self'",
                  "font-src 'self' data:",
                  "worker-src 'self' blob:",
                  "frame-ancestors 'none'",
                  "base-uri 'self'",
                  "form-action 'self'",
                  "object-src 'none'",
                ].join('; '),
              },
            },
          }
        : {}),
    },
  },

  alias: {
    '#shared': resolve(rootDir, 'shared'),
  },

  vite: {
    optimizeDeps: {
      include: ['@vueuse/core', '@zxing/browser', 'browser-image-compression'],
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    server: {
      fs: { allow: [rootDir, workspaceRoot] },
      watch: { ignored: ['**/*.db', '**/migrations/**'] },
    },
    resolve: {
      alias: { '#shared': resolve(rootDir, 'shared') },
    },
  },

  typescript: { strict: true },

  i18n: {
    locales: [
      { code: 'de', language: 'de-DE', file: 'de.json' },
      { code: 'en', language: 'en-US', file: 'en.json' },
    ],
    defaultLocale: 'de',
    strategy: 'no_prefix',
    langDir: 'locales',
    detectBrowserLanguage: false,
  },
})
