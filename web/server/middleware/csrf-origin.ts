import { isProductionRuntime } from '../utils/runtime-env'

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

function hasSessionCookie(event: Parameters<typeof getHeader>[0]): boolean {
  const cookieHeader = getHeader(event, 'cookie')
  if (!cookieHeader) return false
  return (
    cookieHeader.includes('team_session=')
    || cookieHeader.includes('crew_session=')
    || cookieHeader.includes('nuxt-session')
  )
}

function originHost(value: string | undefined): string | null {
  if (!value?.trim()) return null
  try {
    return new URL(value).host
  }
  catch {
    return null
  }
}

export default defineEventHandler((event) => {
  if (!isProductionRuntime()) return
  if (!event.path.startsWith('/api/')) return
  if (!MUTATING.has(event.method)) return
  if (!hasSessionCookie(event)) return

  const expectedHost = getRequestURL(event).host
  const origin = getHeader(event, 'origin')
  const referer = getHeader(event, 'referer')
  const sourceHost = originHost(origin) ?? originHost(referer)

  if (!sourceHost || sourceHost !== expectedHost) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid origin' })
  }
})
