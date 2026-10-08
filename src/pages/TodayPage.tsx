import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { AutoText } from '../components/AutoText'
import { TaskSheet } from '../components/TaskSheet'
import { addTask, db, emptyDay, saveDay, updateTask, type Task } from '../lib/db'
import { addDays, dayOfYear, fromKey, MONTHS_EN, todayKey, toMinutes, WEEKDAYS_EN, WEEKDAYS_KO } from '../lib/date'
import { useSettings } from '../lib/settings'

type SheetState = { task?: Task; defaults?: Partial<Task> } | null

export function TodayPage() {
  const [dateKey, setDateKey] = useState(todayKey)
  const [sheet, setSheet] = useState<SheetState>(null)
  const isToday = dateKey === todayKey()
  const date = fromKey(dateKey)
  const year = date.getFullYear()
  const daysInYear = new Date(year, 1, 29).getMonth() === 1 ? 366 : 365

  const day = useLiveQuery(() => db.days.get(dateKey), [dateKey]) ?? emptyDay(dateKey)
  const tasks = useLiveQuery(
    () => db.tasks.where('date').equals(dateKey).filter((t) => !t.deleted).sortBy('order'),
    [dateKey],
  )
  const overdue = useLiveQuery(
    () =>
      isToday
        ? db.tasks.where('date').below(dateKey).filter((t) => !t.deleted && !t.done && !t.startTime).toArray()
        : [],
    [dateKey, isToday],
  )

  const timed = (tasks ?? []).filter((t) => t.startTime)
  const untimed = (tasks ?? []).filter((t) => !t.startTime)

  // 좌우 스와이프로 어제/내일
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) setDateKey(addDays(dateKey, dx < 0 ? 1 : -1))
  }

  const setGoal = (i: number, v: string) => {
    const goals = [...day.goals]
    goals[i] = v
    saveDay(dateKey, { goals })
  }

  return (
    <div className="page today" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {!isToday && (
        <button className="ribbon" onClick={() => setDateKey(todayKey())} aria-label="오늘로 돌아가기">
          오늘
        </button>
      )}

      <header className="day-head">
        <button className="icon-btn" onClick={() => setDateKey(addDays(dateKey, -1))} aria-label="어제">
          ‹
        </button>
        <label className="day-title">
          <span className="day-num">{date.getDate()}</span>
          <span className="day-meta">
            <span className="day-month">
              {MONTHS_EN[date.getMonth()]} {year}
            </span>
            <span className={`day-week w${date.getDay()}`}>
              {WEEKDAYS_KO[date.getDay()]}요일 · {WEEKDAYS_EN[date.getDay()]}
            </span>
          </span>
          <input
            type="date"
            className="date-overlay"
            value={dateKey}
            onChange={(e) => e.target.value && setDateKey(e.target.value)}
            aria-label="날짜 선택"
          />
        </label>
        <span className="day-count">
          {dayOfYear(date)}/{daysInYear}
        </span>
        <button className="icon-btn" onClick={() => setDateKey(addDays(dateKey, 1))} aria-label="내일">
          ›
        </button>
      </header>

      <section className="block goals">
        <h3 className="block-title">오늘의 목표</h3>
        {[0, 1, 2].map((i) => (
          <div key={i} className="goal-row">
            <span className="goal-num">{i + 1}</span>
            <AutoText
              key={dateKey}
              className="line-input"
              value={day.goals[i] ?? ''}
              onSave={(v) => setGoal(i, v)}
              placeholder={i === 0 ? '가장 중요한 한 가지' : ''}
            />
          </div>
        ))}
      </section>

      <div className="spread">
        <section className="block timeline-block">
          <h3 className="block-title">타임라인</h3>
          <Timeline
            tasks={timed}
            showNow={isToday}
            onPickHour={(h) =>
              setSheet({ defaults: { date: dateKey, startTime: hhmm(h), endTime: h >= 23 ? '23:59' : hhmm(h + 1) } })
            }
            onPickTask={(task) => setSheet({ task })}
          />
        </section>

        <section className="block todo-block">
          <h3 className="block-title">
            할 일
            <button className="add-btn" onClick={() => setSheet({ defaults: { date: dateKey } })}>
              ＋
            </button>
          </h3>

          {overdue && overdue.length > 0 && (
            <div className="carry">
              <span>어제까지 못 끝낸 일 {overdue.length}개</span>
              <button
                className="link"
                onClick={() => Promise.all(overdue.map((t) => updateTask(t.id, { date: dateKey })))}
              >
                오늘로 가져오기
              </button>
            </div>
          )}

          <ul className="todo-list">
            {untimed.map((t) => (
              <TodoItem key={t.id} task={t} onOpen={() => setSheet({ task: t })} />
            ))}
          </ul>
          <QuickAdd dateKey={dateKey} />
        </section>
      </div>

      <section className="block">
        <h3 className="block-title">하루 회고</h3>
        <AutoText
          key={dateKey}
          multiline
          className="lined-area"
          value={day.reflection}
          onSave={(v) => saveDay(dateKey, { reflection: v })}
          placeholder="오늘은 어떤 하루였나요?"
        />
      </section>

      <footer className="quote">
        <span className="quote-label">오늘의 한마디</span>
        <AutoText
          key={dateKey}
          className="line-input quote-input"
          value={day.quote}
          onSave={(v) => saveDay(dateKey, { quote: v })}
          placeholder="마음에 남는 한 문장"
        />
      </footer>

      {sheet && <TaskSheet task={sheet.task} defaults={sheet.defaults} onClose={() => setSheet(null)} />}
    </div>
  )
}

function TodoItem({ task, onOpen }: { task: Task; onOpen: () => void }) {
  return (
    <li className={`todo ${task.done ? 'is-done' : ''}`}>
      <button
        className="check"
        aria-label={task.done ? '완료 취소' : '완료'}
        onClick={() => updateTask(task.id, { done: task.done ? 0 : 1 })}
      >
        {task.done ? '✓' : ''}
      </button>
      <button className="todo-title" onClick={onOpen}>
        {task.title}
      </button>
      {!task.done && task.date && (
        <button className="link small" onClick={() => updateTask(task.id, { date: addDays(task.date!, 1) })}>
          내일로 →
        </button>
      )}
    </li>
  )
}

function QuickAdd({ dateKey }: { dateKey: string }) {
  const [title, setTitle] = useState('')
  return (
    <form
      className="quick-add"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!title.trim()) return
        await addTask({ title: title.trim(), date: dateKey })
        setTitle('')
      }}
    >
      <span className="check ghost" />
      <input className="line-input" placeholder="할 일 추가…" value={title} onChange={(e) => setTitle(e.target.value)} />
    </form>
  )
}

const HOUR_PX = 44
const hhmm = (h: number) => `${String(h).padStart(2, '0')}:00`

function Timeline({
  tasks,
  showNow,
  onPickHour,
  onPickTask,
}: {
  tasks: Task[]
  showNow: boolean
  onPickHour: (h: number) => void
  onPickTask: (t: Task) => void
}) {
  const { timelineStart: start, timelineEnd: end } = useSettings()
  const hours = Array.from({ length: end - start }, (_, i) => start + i)
  const nowMin = useNowMinutes()

  return (
    <div className="timeline" style={{ height: hours.length * HOUR_PX }}>
      {hours.map((h, i) => (
        <button key={h} className="hour" style={{ top: i * HOUR_PX, height: HOUR_PX }} onClick={() => onPickHour(h)}>
          <span className="hour-label">{h}</span>
        </button>
      ))}
      {showNow && nowMin >= start * 60 && nowMin < end * 60 && (
        <div className="now-line" style={{ top: ((nowMin - start * 60) / 60) * HOUR_PX }} />
      )}
      {tasks.map((t) => {
        const s = Math.max(toMinutes(t.startTime!), start * 60)
        const e = Math.min(t.endTime ? toMinutes(t.endTime) : s + 60, end * 60)
        if (e <= start * 60 || s >= end * 60) return null
        return (
          <button
            key={t.id}
            className={`event ${t.done ? 'is-done' : ''}`}
            style={{ top: ((s - start * 60) / 60) * HOUR_PX, height: Math.max(((e - s) / 60) * HOUR_PX - 2, 20) }}
            onClick={() => onPickTask(t)}
          >
            <span className="event-time">
              {t.startTime}
              {t.endTime && `–${t.endTime}`}
            </span>
            <span className="event-title">{t.title}</span>
          </button>
        )
      })}
    </div>
  )
}

/** 현재 시각(분)을 1분마다 갱신 */
function useNowMinutes() {
  const calc = () => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  }
  const [min, setMin] = useState(calc)
  useEffect(() => {
    const id = window.setInterval(() => setMin(calc()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return min
}
