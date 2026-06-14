import { createError, setHeader } from 'h3'
import { isMetricsScrapeAllowed } from '../utils/metrics-access.utils'
import { metricsRegistry, renderPrometheusMetrics } from '../utils/prometheus-metrics'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.metricsEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  if (!isMetricsScrapeAllowed(event, config.metricsToken)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await renderPrometheusMetrics()
  setHeader(event, 'Content-Type', metricsRegistry.contentType)

  return body
})
