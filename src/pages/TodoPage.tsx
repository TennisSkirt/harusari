import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { TaskSheet } from '../components/TaskSheet'
import { TodoRow } from '../components/TodoRow'
import { addTask, db, type Task } from '../lib/db'
import { addDays, fromKey, todayKey, WEEKDAYS_KO } from '../lib/date'
import { nextOccurrence } from '../lib/recurrence'
import { itemKey, useCategories, type TaskItem } from '../lib/tasks'

const SEGMENTS = [
  { id: 'today', label: '오늘' },
  { id: 'upcoming', label: '예정' },
  { id: 'someday', label: '언젠가' },
  { id: 'done', label: '완료' },
] as const
type Segment = (typeof SEGMENTS)[number]['id']

type SheetState = { task?: TaskItem; defaults?: Partial<TaskItem> } | null

export function TodoPage() {
  const [seg, setSeg] = useState<Segment>('today')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetState>(null)
  const cats = useCategories()
  const catMap = new Map(cats.map((c) => [c.id, c]))
  const today = todayKey()

  const all = useLiveQuery(() => db.tasks.filter((t) => !t.deleted).toArray(), [])
  const groups = buildGroups(all ?? [], seg, today).map((g) => ({
    ...g,
    items: catFilter ? g.items.filter((t) => t.categoryId === catFilter) : g.items,
  }))
  const empty = groups.every((g) => g.items.length === 0)

  const defaultDate = seg === 'today' ? today : seg === 'upcoming' ? addDays(today, 1) : undefined

  return (
    <div className="page todo-page">
      <header className="page-head">
        <h1 className="page-title">할 일</h1>
        <div className="segmented">
          {SEGMENTS.map((s) => (
            <button key={s.id} className={seg === s.id ? 'is-active' : ''} onClick={() => setSeg(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </header>

      {cats.length > 0 && (
        <div className="chips cat-filter">
          <button className={`chip ${!catFilter ? 'is-on' : ''}`} onClick={() => setCatFilter(null)}>
            전체
          </button>
          {cats.map((c) => (
            <button
              key={c.id}
              className={`chip cat-chip ${catFilter === c.id ? 'is-on' : ''}`}
              style={{ '--cat': c.color } as React.CSSProperties}
              onClick={() => setCatFilter(catFilter === c.id ? null : c.id)}
            >
              <span className="cat-dot" />
              {c.name}
            </button>
          ))}
        </div>
      )}

      {seg !== 'done' && (
        <QuickAdd
          key={seg}
          placeholder={seg === 'someday' ? '언젠가 할 일 추가…' : seg === 'upcoming' ? '내일 할 일 추가…' : '오늘 할 일 추가…'}
          onAdd={(title) => addTask({ title, date: defaultDate, categoryId: catFilter ?? undefined })}
          onDetail={() => setSheet({ defaults: { date: defaultDate, categoryId: catFilter ?? undefined } })}
        />
      )}

      {empty && <p className="empty">{EMPTY[seg]}</p>}

      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <section key={g.title} className={`todo-group ${g.tone ?? ''}`}>
              {g.title && (
                <h3 className="group-title">
                  {g.title}
                  <span className="group-count">{g.items.length}</span>
                </h3>
              )}
              <ul className="todo-list">
                {g.items.map((t) => (
                  <TodoRow
                    key={itemKey(t)}
                    task={t}
                    category={t.categoryId ? catMap.get(t.categoryId) : undefined}
                    showDate={g.showDate}
                    onOpen={() => setSheet({ task: t })}
                  />
                ))}
              </ul>
            </section>
          ),
      )}

      {sheet && <TaskSheet task={sheet.task} defaults={sheet.defaults} onClose={() => setSheet(null)} />}
    </div>
  )
}

const EMPTY: Record<Segment, string> = {
  today: '오늘 할 일이 없어요. 여유로운 하루 ☕',
  upcoming: '예정된 할 일이 없어요.',
  someday: '날짜 없이 적어두고 싶은 일을 모아보세요.',
  done: '아직 완료한 일이 없어요.',
}

interface Group {
  title: string
  items: TaskItem[]
  showDate?: boolean
  tone?: string
}

function buildGroups(all: Task[], seg: Segment, today: string): Group[] {
  const singles = all.filter((t) => !t.series)
  const series = all.filter((t) => t.series)

  if (seg === 'today') {
    const overdue = singles
      .filter((t) => t.date && t.date < today && !t.done)
      .sort((a, b) => a.date!.localeCompare(b.date!))
    const todays: TaskItem[] = [
      ...singles.filter((t) => t.date === today),
      ...series.filter((s) => nextOccurrence(s, today, 1) === today).map((s) => ({ ...s, date: today, occurrence: today })),
    ].sort((a, b) => a.done - b.done || (a.startTime ?? '99').localeCompare(b.startTime ?? '99') || a.order - b.order)
    return [
      { title: '지난 할 일', items: overdue, showDate: true, tone: 'is-overdue' },
      { title: overdue.length ? '오늘' : '', items: todays },
    ]
  }

  if (seg === 'upcoming') {
    const from = addDays(today, 1)
    const items: TaskItem[] = [
      ...singles.filter((t) => t.date && t.date >= from && !t.done),
      // 반복 일정은 다음 한 번만 보여줌
      ...series.flatMap((s) => {
        const next = nextOccurrence(s, from)
        return next ? [{ ...s, date: next, occurrence: next }] : []
      }),
    ].sort((a, b) => a.date!.localeCompare(b.date!) || (a.startTime ?? '99').localeCompare(b.startTime ?? '99'))

    const byDate = new Map<string, TaskItem[]>()
    for (const t of items) byDate.set(t.date!, [...(byDate.get(t.date!) ?? []), t])
    return [...byDate].map(([key, list]) => ({ title: dateTitle(key, today), items: list }))
  }

  if (seg === 'someday') {
    return [{ title: '', items: singles.filter((t) => !t.date && !t.done).sort((a, b) => a.order - b.order) }]
  }

  const done = singles
    .filter((t) => t.done)
    .sort((a, b) => (b.doneAt ?? b.updatedAt) - (a.doneAt ?? a.updatedAt))
    .slice(0, 200)
  return [{ title: '', items: done, showDate: true }]
}

function dateTitle(key: string, today: string) {
  const d = fromKey(key)
  const diff = Math.round((d.getTime() - fromKey(today).getTime()) / 86400000)
  const label = `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS_KO[d.getDay()]}요일`
  if (diff === 1) return `내일 · ${label}`
  if (diff === 2) return `모레 · ${label}`
  return d.getFullYear() === fromKey(today).getFullYear() ? label : `${d.getFullYear()}년 ${label}`
}

function QuickAdd({
  placeholder,
  onAdd,
  onDetail,
}: {
  placeholder: string
  onAdd: (title: string) => void
  onDetail: () => void
}) {
  const [title, setTitle] = useState('')
  return (
    <form
      className="quick-add boxed"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        onAdd(title.trim())
        setTitle('')
      }}
    >
      <span className="check ghost" />
      <input className="line-input" placeholder={placeholder} value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="button" className="link small" onClick={onDetail}>
        자세히
      </button>
    </form>
  )
}
