import { useLiveQuery } from 'dexie-react-hooks'
import { addTask, db, removeTask, updateTask, type Category, type Task, type TaskInput } from './db'
import { addDays } from './date'
import { occursOn } from './recurrence'

/**
 * 화면에 표시되는 할 일 한 건.
 * 반복 일정은 원본 하나에서 날짜별로 펼쳐서 보여주고(occurrence), 체크·수정하는 순간 개별 할 일로 떼어낸다.
 */
export type TaskItem = Task & { occurrence?: string }

export const itemKey = (t: TaskItem) => (t.occurrence ? `${t.id}@${t.occurrence}` : t.id)

const alive = (t: Task) => !t.deleted

const byTime = (a: TaskItem, b: TaskItem) => {
  if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
  if (a.startTime) return -1
  if (b.startTime) return 1
  return a.order - b.order
}

/** 특정 날짜의 할 일 (개별 + 반복 펼침) */
export async function tasksOn(key: string): Promise<TaskItem[]> {
  const [single, series] = await Promise.all([
    db.tasks.where('date').equals(key).filter((t) => alive(t) && !t.series).toArray(),
    db.tasks.where('series').equals(1).filter(alive).toArray(),
  ])
  const occ = series.filter((s) => occursOn(s, key)).map((s) => ({ ...s, date: key, occurrence: key }))
  return [...single, ...occ].sort(byTime)
}

export const useTasksOn = (key: string) => useLiveQuery(() => tasksOn(key), [key])

export function useCategories(): Category[] {
  return useLiveQuery(() => db.categories.orderBy('order').filter((c) => !c.deleted).toArray(), []) ?? []
}

export function useCategoryMap(): Map<string, Category> {
  const cats = useCategories()
  return new Map(cats.map((c) => [c.id, c]))
}

/* ───────── 반복 일정 조작 ───────── */

/** 반복 일정에서 그날 하나를 개별 할 일로 떼어낸다 */
async function detach(item: TaskItem, patch: Partial<TaskInput>) {
  const series = await db.tasks.get(item.id)
  if (!series || !item.occurrence) return
  await updateTask(series.id, { skip: [...(series.skip ?? []), item.occurrence] })
  await addTask({
    title: series.title,
    date: item.occurrence,
    startTime: series.startTime,
    endTime: series.endTime,
    categoryId: series.categoryId,
    repeat: undefined,
    seriesId: series.id,
    ...patch,
  })
}

export async function toggleDone(item: TaskItem) {
  if (item.occurrence) return detach(item, { done: 1, doneAt: Date.now() })
  await updateTask(item.id, { done: item.done ? 0 : 1 })
}

export async function moveToNextDay(item: TaskItem) {
  if (!item.date) return
  const next = addDays(item.date, 1)
  if (item.occurrence) return detach(item, { date: next })
  await updateTask(item.id, { date: next })
}

export type Scope = 'one' | 'following'

/** 반복 일정 수정: 이번만 / 이후 전체 */
export async function editOccurrence(item: TaskItem, data: TaskInput, scope: Scope) {
  const series = await db.tasks.get(item.id)
  if (!series || !item.occurrence) return
  if (scope === 'one') return detach(item, { ...data, repeat: undefined })

  // 이후 전체: 기존 반복은 전날까지로 끝내고, 이날부터 새 반복을 시작
  if (item.occurrence <= series.date!) {
    await updateTask(series.id, { ...data, date: data.date ?? item.occurrence })
    return
  }
  await updateTask(series.id, { repeat: { ...series.repeat!, until: addDays(item.occurrence, -1) } })
  await addTask({ ...data, date: data.date ?? item.occurrence })
}

export async function deleteOccurrence(item: TaskItem, scope: Scope) {
  const series = await db.tasks.get(item.id)
  if (!series || !item.occurrence) return
  if (scope === 'one') {
    await updateTask(series.id, { skip: [...(series.skip ?? []), item.occurrence] })
  } else if (item.occurrence <= series.date!) {
    await removeTask(series.id)
  } else {
    await updateTask(series.id, { repeat: { ...series.repeat!, until: addDays(item.occurrence, -1) } })
  }
}
