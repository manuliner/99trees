import type { H3Event } from 'h3'
import { getMethod, getRequestURL } from 'h3'
import { performance } from 'node:perf_hooks'
import { metricsRouteLabel, recordHttpMetrics } from '../utils/prometheus-metrics'

function isApiRoute(event: H3Event): boolean {
  return event.path.startsWith('/api/')
}

function isMetricsEnabled(): boolean {
  const config = useRuntimeConfig()
  return config.metricsEnabled === true
}

const SKIP_METRICS_PATHS = new Set(['/api/health', '/api/metrics'])

export default defineEventHandler((event: H3Event) => {
  if (!isMetricsEnabled() || !isApiRoute(event)) {
    return
  }

  const pathname = getRequestURL(event).pathname
  if (SKIP_METRICS_PATHS.has(pathname)) {
    return
  }

  const start = performance.now()
  const method = getMethod(event)
  const route = metricsRouteLabel(pathname)

  const onFinish = () => {
    const durationSeconds = (performance.now() - start) / 1000
    const statusCode = event.node.res.statusCode || 200
    recordHttpMetrics(method, route, statusCode, durationSeconds)
  }

  event.node.res.once('finish', onFinish)
  event.node.res.once('close', onFinish)
})
