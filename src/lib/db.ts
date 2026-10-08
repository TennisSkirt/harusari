import Dexie, { type EntityTable } from 'dexie'

// 나중에 기기 간 동기화를 붙일 수 있도록 모든 레코드에 id(uuid), updatedAt, deleted를 둔다.
interface SyncFields {
  id: string
  updatedAt: number
  deleted?: 0 | 1
}

export interface Task extends SyncFields {
  title: string
  /** YYYY-MM-DD, 없으면 "언젠가" */
  date?: string
  /** HH:mm, 있으면 타임라인 일정 */
  startTime?: string
  endTime?: string
  done: 0 | 1
  categoryId?: string
  order: number
  createdAt: number
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
  days: EntityTable<DayPage, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  tasks: 'id, date, done, updatedAt, deleted',
  days: 'id, updatedAt',
  settings: 'key',
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

export async function addTask(input: Pick<Task, 'title' | 'date' | 'startTime' | 'endTime'>) {
  const now = Date.now()
  await db.tasks.add({ ...input, id: newId(), done: 0, order: now, createdAt: now, updatedAt: now })
}

export async function updateTask(id: string, patch: Partial<Omit<Task, 'id'>>) {
  await db.tasks.update(id, { ...patch, updatedAt: Date.now() })
}

export async function removeTask(id: string) {
  await updateTask(id, { deleted: 1 })
}
