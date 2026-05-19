export function resolveRuntimeEnvironment(): string {
  return process.env.NUXT_ENVIRONMENT || process.env.NODE_ENV || 'development'
}

export function isProductionRuntime(): boolean {
  return resolveRuntimeEnvironment() === 'production'
}
