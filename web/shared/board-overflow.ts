function parseFieldList(json: string): number[] {
  try {
    const parsed = JSON.parse(json) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map(Number).filter((n) => Number.isFinite(n))
  }
  catch {
    return []
  }
}

/** Overflow JSON to restore after zero-round abandon. */
export function overflowJsonAfterAbandon(
  currentOverflowJson: string,
  pathOverflowFieldsJson: string,
  snapshotBeforeRollJson: string | null | undefined,
): string {
  if (snapshotBeforeRollJson != null) {
    return snapshotBeforeRollJson
  }
  const current = parseFieldList(currentOverflowJson)
  const toRemove = new Set(parseFieldList(pathOverflowFieldsJson))
  return JSON.stringify(current.filter((field) => !toRemove.has(field)))
}
