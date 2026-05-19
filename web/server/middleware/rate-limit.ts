import { getClientIp } from '../utils/client-ip'

const buckets = new Map<string, { count: number; resetAt: number }>()

const LIMITS: { prefix: string; max: number; windowMs: number }[] = [
  { prefix: '/api/teams/rejoin', max: 20, windowMs: 15 * 60_000 },
  { prefix: '/api/teams', max: 30, windowMs: 15 * 60_000 },
  { prefix: '/api/crew/login', max: 20, windowMs: 15 * 60_000 },
  { prefix: '/api/admin/login', max: 20, windowMs: 15 * 60_000 },
  { prefix: '/api/teams/directory', max: 60, windowMs: 60_000 },
  { prefix: '/api/turns/roll', max: 30, windowMs: 60_000 },
  { prefix: '/api/turns/', max: 120, windowMs: 60_000 },
  { prefix: '/api/leaderboard', max: 60, windowMs: 60_000 },
]

function getLimit(path: string, method: string) {
  if (path === '/api/teams' && method === 'POST') {
    return LIMITS.find((l) => l.prefix === '/api/teams') ?? null
  }
  return LIMITS.find((l) => l.prefix !== '/api/teams' && path.startsWith(l.prefix)) ?? null
}

export default defineEventHandler((event) => {
  const path = event.path
  if (!path.startsWith('/api/')) return

  const rule = getLimit(path, event.method)
  if (!rule) return

  const ip = getClientIp(event)
  const key = `${ip}:${rule.prefix}:${event.method}`
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + rule.windowMs }
    buckets.set(key, bucket)
  }
  bucket.count += 1
  if (bucket.count > rule.max) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }
})
