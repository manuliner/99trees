import type { H3Event } from 'h3'
import { getHeader } from 'h3'

function parseClientIp(event: H3Event): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? ''
  }
  return event.node.req.socket.remoteAddress ?? ''
}

function isPrivateOrLoopbackIp(ip: string): boolean {
  if (!ip) return false
  const normalized = ip.startsWith('::ffff:') ? ip.slice(7) : ip
  if (normalized === '127.0.0.1' || normalized === '::1') return true
  if (normalized.startsWith('10.')) return true
  if (normalized.startsWith('192.168.')) return true
  const parts = normalized.split('.').map(Number)
  if (parts.length === 4 && parts[0] === 172 && parts[1] !== undefined && parts[1] >= 16 && parts[1] <= 31) {
    return true
  }
  return false
}

export function isMetricsScrapeAllowed(event: H3Event, metricsToken?: string | null): boolean {
  const clientIp = parseClientIp(event)
  if (isPrivateOrLoopbackIp(clientIp)) {
    return true
  }

  if (!metricsToken) {
    return false
  }

  const authHeader = getHeader(event, 'authorization')
  return authHeader === `Bearer ${metricsToken}`
}
