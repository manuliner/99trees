import { describe, expect, it } from 'vitest'
import { metricsRouteLabel, recordHttpMetrics, renderPrometheusMetrics } from './prometheus-metrics'

describe('prometheus-metrics', () => {
  it('normalizes numeric and uuid path segments', () => {
    expect(metricsRouteLabel('/api/turns/42/scan')).toBe('/api/turns/:id/scan')
    expect(metricsRouteLabel('/api/teams/550e8400-e29b-41d4-a716-446655440000')).toBe('/api/teams/:id')
  })

  it('exposes prometheus text after recording a sample', async () => {
    recordHttpMetrics('GET', '/api/leaderboard', 200, 0.05)
    const body = await renderPrometheusMetrics()
    expect(body).toContain('trees99_http_request_duration_seconds')
    expect(body).toContain('route="/api/leaderboard"')
  })
})
