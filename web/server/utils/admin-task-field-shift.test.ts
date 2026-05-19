import { describe, expect, it } from 'vitest'
import { planFieldInsertMove, planFieldInsertSlot } from './admin-task-field-shift'

function tasksFromFields(fields: Record<number, number>): { id: number; fieldNumber: number }[] {
  return Object.entries(fields).map(([field, id]) => ({
    id,
    fieldNumber: Number(field),
  }))
}

function fieldMap(tasks: { id: number; fieldNumber: number }[]): Map<number, number> {
  return new Map(tasks.map((t) => [t.fieldNumber, t.id]))
}

describe('planFieldInsertMove', () => {
  it('moves 50→40 on a full 1..50 board', () => {
    const initial = tasksFromFields(
      Object.fromEntries(Array.from({ length: 50 }, (_, i) => [i + 1, i + 1])),
    )
    const result = planFieldInsertMove(initial, 50, 40)
    const byField = fieldMap(result)

    expect(byField.get(40)).toBe(50)
    expect(byField.get(41)).toBe(40)
    expect(byField.get(50)).toBe(49)
    expect(byField.has(51)).toBe(false)
    expect(byField.get(39)).toBe(39)
  })

  it('moves 35→40 and compacts 36–39', () => {
    const initial = tasksFromFields(
      Object.fromEntries(Array.from({ length: 50 }, (_, i) => [i + 1, i + 1])),
    )
    const result = planFieldInsertMove(initial, 35, 40)
    const byField = fieldMap(result)

    expect(byField.get(40)).toBe(35)
    expect(byField.get(35)).toBe(36)
    expect(byField.get(38)).toBe(39)
    expect(byField.get(39)).toBe(undefined)
    expect(byField.get(41)).toBe(40)
    expect(byField.get(51)).toBe(50)
  })

  it('moves 45→40 and compacts tail above 45', () => {
    const initial = tasksFromFields(
      Object.fromEntries(Array.from({ length: 50 }, (_, i) => [i + 1, i + 1])),
    )
    const result = planFieldInsertMove(initial, 45, 40)
    const byField = fieldMap(result)

    expect(byField.get(40)).toBe(45)
    expect(byField.get(45)).toBe(44)
    expect(byField.get(46)).toBe(46)
    expect(byField.get(50)).toBe(50)
    expect(byField.has(51)).toBe(false)
  })

  it('is a no-op when field unchanged', () => {
    const initial = [{ id: 1, fieldNumber: 5 }]
    expect(planFieldInsertMove(initial, 1, 5)).toEqual(initial)
  })
})

describe('planFieldInsertSlot', () => {
  it('shifts fields 40+ up by one for create at occupied 40', () => {
    const initial = tasksFromFields(
      Object.fromEntries(Array.from({ length: 50 }, (_, i) => [i + 1, i + 1])),
    )
    const result = planFieldInsertSlot(initial, 40)
    const byField = fieldMap(result)

    expect(byField.has(40)).toBe(false)
    expect(byField.get(41)).toBe(40)
    expect(byField.get(51)).toBe(50)
  })
})
