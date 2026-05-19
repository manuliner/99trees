/** Board readiness: stations must fill fields 1…N contiguously; trailing empty slots are ignored. */

export function analyzeEditionBoard(
  taskFieldNumbers: readonly number[],
  editionFieldCount: number,
): {
  maxTaskField: number
  effectiveFieldCount: number
  trailingEmptySlots: number
  issues: string[]
} {
  const issues: string[] = []
  const maxTaskField = taskFieldNumbers.length ? Math.max(...taskFieldNumbers) : 0
  const fieldSet = new Set(taskFieldNumbers)
  const trailingEmptySlots = Math.max(0, editionFieldCount - maxTaskField)

  if (taskFieldNumbers.length === 0) {
    issues.push('No tasks imported')
    return { maxTaskField: 0, effectiveFieldCount: 0, trailingEmptySlots, issues }
  }

  for (let i = 1; i <= maxTaskField; i++) {
    if (!fieldSet.has(i)) issues.push(`Missing task for field ${i}`)
  }

  if (taskFieldNumbers.length !== maxTaskField) {
    issues.push(
      `Expected ${maxTaskField} tasks (fields 1–${maxTaskField} contiguous), got ${taskFieldNumbers.length}`,
    )
  }

  return {
    maxTaskField,
    effectiveFieldCount: maxTaskField,
    trailingEmptySlots,
    issues,
  }
}
