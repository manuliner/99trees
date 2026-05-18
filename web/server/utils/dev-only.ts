function resolveEnvironment(): string {
  return process.env.NUXT_ENVIRONMENT || process.env.NODE_ENV || 'development'
}

/** Local Vite dev, or hosted test (`NUXT_ENVIRONMENT=test`). Never production. */
export function isDevSimulationEnabled(): boolean {
  if (import.meta.dev) return true
  return resolveEnvironment() === 'test'
}

export function assertDevOnly() {
  if (!isDevSimulationEnabled()) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
}
