import { resolveRuntimeEnvironment } from './runtime-env'

/** Local Vite dev or NUXT_ENVIRONMENT=test — disabled on production deploys. */
export function isDevSimulationEnabled(): boolean {
  return import.meta.dev || resolveRuntimeEnvironment() === 'test'
}

export function assertDevOnly() {
  if (!isDevSimulationEnabled()) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
}
