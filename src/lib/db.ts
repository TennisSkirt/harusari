import Dexie, { type EntityTable } from 'dexie'

// 나중에 기기 간 동기화를 붙일 수 있도록 모든 레코드에 id(uuid), updatedAt, deleted를 둔다.
interface SyncFields {
  id: string
  updatedAt: number
  deleted?: 0 | 1
}

export type RepeatFreq = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly'

export interface RepeatRule {
  freq: RepeatFreq
  /** weekly일 때 반복할 요일 (0=일 ~ 6=토) */
  weekdays?: number[]
  /** 이 날짜까지 반복 (YYYY-MM-DD, 포함) */
  until?: string
}

export interface Task extends SyncFields {
  title: string
  /** YYYY-MM-DD, 없으면 "언젠가". 반복 일정이면 반복 시작일 */
  date?: string
  /** HH:mm, 있으면 타임라인 일정 */
  startTime?: string
  endTime?: string
  done: 0 | 1
  /** 완료한 시각 (완료 목록 정렬용) */
  doneAt?: number
  categoryId?: string
  order: number
  createdAt: number
  /** 반복 일정의 원본이면 1 */
  series?: 0 | 1
  repeat?: RepeatRule
  /** 반복에서 빠진 날짜들 (개별 수정·완료·삭제된 날) */
  skip?: string[]
  /** 반복 일정에서 떨어져 나온 개별 일정이면 원본 id */
  seriesId?: string
}

export interface Category extends SyncFields {
  name: string
  color: string
  order: number
}

export interface DayPage extends SyncFields {
  /** id = YYYY-MM-DD */
  goals: string[]
  reflection: string
  quote: string
}

export interface Setting {
  key: string
  value: unknown
}

export const db = new Dexie('harusari') as Dexie & {
  tasks: EntityTable<Task, 'id'>
  categories: EntityTable<Category, 'id'>
  days: EntityTable<DayPage, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  tasks: 'id, date, done, updatedAt, deleted',
  days: 'id, updatedAt',
  settings: 'key',
})

db.version(2).stores({
  tasks: 'id, date, done, series, updatedAt, deleted',
  categories: 'id, order, updatedAt',
})

export const newId = () => crypto.randomUUID()

export const emptyDay = (id: string): DayPage => ({
  id,
  goals: ['', '', ''],
  reflection: '',
  quote: '',
  updatedAt: 0,
})

export async function saveDay(id: string, patch: Partial<Omit<DayPage, 'id'>>) {
  const current = (await db.days.get(id)) ?? emptyDay(id)
  await db.days.put({ ...current, ...patch, id, updatedAt: Date.now() })
}

export type TaskInput = Pick<Task, 'title' | 'date' | 'startTime' | 'endTime' | 'categoryId' | 'repeat'> &
  Partial<Pick<Task, 'done' | 'doneAt' | 'seriesId' | 'order'>>

export async function addTask(input: TaskInput) {
  const now = Date.now()
  const id = newId()
  await db.tasks.add({
    done: 0,
    order: now,
    ...input,
    series: input.repeat ? 1 : 0,
    id,
    createdAt: now,
    updatedAt: now,
  })
  return id
}

export async function updateTask(id: string, patch: Partial<Omit<Task, 'id'>>) {
  const p = { ...patch, updatedAt: Date.now() }
  if ('repeat' in patch) p.series = patch.repeat ? 1 : 0
  if ('done' in patch) p.doneAt = patch.done ? Date.now() : undefined
  await db.tasks.update(id, p)
}

export async function removeTask(id: string) {
  await updateTask(id, { deleted: 1 })
}

/* ───────── 카테고리 ───────── */

/** 라이트·다크 모두에서 읽히는 차분한 색 */
export const CATEGORY_COLORS = [
  '#c0392b', // 빨강
  '#d9822b', // 주황
  '#c9a227', // 겨자
  '#5a9a4e', // 초록
  '#2f8f83', // 청록
  '#2e6da4', // 파랑
  '#6f5fb3', // 보라
  '#b5527f', // 자주
  '#8a6d55', // 갈색
  '#6b7280', // 회색
]

export async function addCategory(name: string, color: string) {
  const now = Date.now()
  const id = newId()
  await db.categories.add({ id, name, color, order: now, updatedAt: now })
  return id
}

export async function updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'color'>>) {
  await db.categories.update(id, { ...patch, updatedAt: Date.now() })
}

export async function removeCategory(id: string) {
  await db.categories.update(id, { deleted: 1, updatedAt: Date.now() })
}
