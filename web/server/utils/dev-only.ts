/** Local Vite dev only — never enabled on deployed hosts (including NUXT_ENVIRONMENT=test). */
export function isDevSimulationEnabled(): boolean {
  return import.meta.dev
}

export function assertDevOnly() {
  if (!isDevSimulationEnabled()) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
}
