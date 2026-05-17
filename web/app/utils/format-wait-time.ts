export function formatWaitTime(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  return `${h} h ago`
}
