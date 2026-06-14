import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client'

const METRICS_PREFIX = 'trees99_'

export const metricsRegistry = new Registry()

collectDefaultMetrics({
  register: metricsRegistry,
  prefix: METRICS_PREFIX,
})

export const httpRequestDurationSeconds = new Histogram({
  name: `${METRICS_PREFIX}http_request_duration_seconds`,
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
})

export const httpRequestErrorsTotal = new Counter({
  name: `${METRICS_PREFIX}http_request_errors_total`,
  help: 'Total HTTP responses with status >= 500',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [metricsRegistry],
})

/** Normalize path for metric labels — no IDs, no query strings. */
export function metricsRouteLabel(pathname: string): string {
  const withoutQuery = pathname.split('?')[0] ?? pathname
  return withoutQuery
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
}

export function recordHttpMetrics(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number,
): void {
  const labels = {
    method: method.toUpperCase(),
    route,
    status_code: String(statusCode),
  }

  httpRequestDurationSeconds.observe(labels, durationSeconds)

  if (statusCode >= 500) {
    httpRequestErrorsTotal.inc(labels)
  }
}

export async function renderPrometheusMetrics(): Promise<string> {
  return metricsRegistry.metrics()
}
