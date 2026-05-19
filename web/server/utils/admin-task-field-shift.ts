import { MAX_EDITION_FIELD_COUNT } from '../../shared/types'
import { and, eq, ne } from 'drizzle-orm'
import { editions, tasks } from '../database/schema'
import type { getDb } from './db'
import { assertCanEditBoardFields } from './admin-board-edit'

type Db = ReturnType<typeof getDb>
type TaskRow = typeof tasks.$inferSelect

export type TaskField = { id: number; fieldNumber: number }

/** Pure field map for insert-move; used by tests and DB layer. */
export function planFieldInsertMove(
  tasks: TaskField[],
  taskId: number,
  newField: number,
): TaskField[] {
  const task = tasks.find((t) => t.id === taskId)
  if (!task || task.fieldNumber === newField) return tasks

  const entries = tasks
    .map((t) => ({ id: t.id, fieldNumber: t.fieldNumber }))
    .sort((a, b) => a.fieldNumber - b.fieldNumber)

  const oldIndex = entries.findIndex((t) => t.id === taskId)
  entries.splice(oldIndex, 1)
  const oldField = task.fieldNumber

  const insertAt = entries.findIndex((t) => t.fieldNumber >= newField)
  for (let i = entries.length - 1; i >= insertAt; i--) {
    entries[i]!.fieldNumber++
  }
  entries.splice(insertAt, 0, { id: taskId, fieldNumber: newField })

  if (oldField < newField) {
    for (const entry of [...entries].sort((a, b) => a.fieldNumber - b.fieldNumber)) {
      if (entry.id !== taskId && entry.fieldNumber > oldField && entry.fieldNumber < newField) {
        entry.fieldNumber--
      }
    }
  }
  else if (oldField > newField) {
    for (const entry of [...entries].sort((a, b) => b.fieldNumber - a.fieldNumber)) {
      if (entry.id !== taskId && entry.fieldNumber > oldField) {
        entry.fieldNumber--
      }
    }
  }

  return entries
}

/** Shift all stations at `newField` and above up by one (make room for a new task). */
export function planFieldInsertSlot(tasks: TaskField[], newField: number): TaskField[] {
  const entries = tasks
    .map((t) => ({ id: t.id, fieldNumber: t.fieldNumber }))
    .sort((a, b) => a.fieldNumber - b.fieldNumber)

  const insertAt = entries.findIndex((t) => t.fieldNumber >= newField)
  for (let i = entries.length - 1; i >= insertAt; i--) {
    entries[i]!.fieldNumber++
  }
  return entries
}

function validateNewField(newField: number): void {
  if (!Number.isInteger(newField) || newField < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Field number must be a positive integer' })
  }
  if (newField > MAX_EDITION_FIELD_COUNT) {
    throw createError({
      statusCode: 400,
      statusMessage: `Field number cannot exceed ${MAX_EDITION_FIELD_COUNT}`,
    })
  }
}

async function applyFieldPlan(db: Db, plan: TaskField[]): Promise<void> {
  for (const { id, fieldNumber } of plan) {
    await db.update(tasks).set({ fieldNumber }).where(eq(tasks.id, id))
  }
}

async function syncEditionFieldCount(db: Db, editionId: number): Promise<number> {
  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  const rows = await db
    .select({ fieldNumber: tasks.fieldNumber })
    .from(tasks)
    .where(eq(tasks.editionId, editionId))

  const maxField = rows.length ? Math.max(...rows.map((r) => r.fieldNumber)) : 0
  const fieldCount = Math.max(edition.fieldCount, maxField)
  if (fieldCount !== edition.fieldCount) {
    await db.update(editions).set({ fieldCount }).where(eq(editions.id, editionId))
  }
  return fieldCount
}

async function loadEditionTasks(db: Db, editionId: number): Promise<TaskRow[]> {
  return db.select().from(tasks).where(eq(tasks.editionId, editionId))
}

export async function insertSlotAtField(
  db: Db,
  edition: { id: number; status: string; fieldCount: number },
  newField: number,
): Promise<number> {
  await assertCanEditBoardFields(edition)
  validateNewField(newField)

  const rows = await loadEditionTasks(db, edition.id)
  const plan = planFieldInsertSlot(
    rows.map((r) => ({ id: r.id, fieldNumber: r.fieldNumber })),
    newField,
  )
  await applyFieldPlan(db, plan)
  return syncEditionFieldCount(db, edition.id)
}

export async function insertTaskAtField(
  db: Db,
  edition: { id: number; status: string; fieldCount: number },
  taskId: number,
  newField: number,
): Promise<number> {
  await assertCanEditBoardFields(edition)
  validateNewField(newField)

  const rows = await loadEditionTasks(db, edition.id)
  const task = rows.find((r) => r.id === taskId)
  if (!task) throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  if (task.fieldNumber === newField) return syncEditionFieldCount(db, edition.id)

  const plan = planFieldInsertMove(
    rows.map((r) => ({ id: r.id, fieldNumber: r.fieldNumber })),
    taskId,
    newField,
  )
  await applyFieldPlan(db, plan)
  return syncEditionFieldCount(db, edition.id)
}

/** Whether `field` is occupied by a task other than `excludeTaskId`. */
export async function isFieldOccupied(
  db: Db,
  editionId: number,
  field: number,
  excludeTaskId?: number,
): Promise<boolean> {
  const conditions = [eq(tasks.editionId, editionId), eq(tasks.fieldNumber, field)]
  if (excludeTaskId != null) {
    const row = (
      await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(...conditions, ne(tasks.id, excludeTaskId)))
        .limit(1)
    )[0]
    return !!row
  }
  const row = (
    await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(...conditions))
      .limit(1)
  )[0]
  return !!row
}
