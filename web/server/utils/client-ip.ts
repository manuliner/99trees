import type { H3Event } from 'h3'

function trustProxy(): boolean {
  const v = process.env.NUXT_TRUST_PROXY?.trim().toLowerCase()
  return v === 'true' || v === '1'
}

/** Client IP for rate limiting; X-Forwarded-For only when NUXT_TRUST_PROXY is set (reverse proxy). */
export function getClientIp(event: H3Event): string {
  return getRequestIP(event, { xForwardedFor: trustProxy() }) ?? 'unknown'
}
