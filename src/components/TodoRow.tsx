import type { Category } from '../lib/db'
import { fromKey, todayKey, WEEKDAYS_KO } from '../lib/date'
import { moveToNextDay, toggleDone, type TaskItem } from '../lib/tasks'

/** 할 일 한 줄. showDate면 날짜도 함께 표시 (투두 탭용) */
export function TodoRow({
  task,
  category,
  showDate,
  onOpen,
}: {
  task: TaskItem
  category?: Category
  showDate?: boolean
  onOpen: () => void
}) {
  const overdue = !task.done && task.date && task.date < todayKey()
  const meta = [
    showDate && task.date && formatDate(task.date),
    task.startTime && `${task.startTime}${task.endTime ? `–${task.endTime}` : ''}`,
  ].filter(Boolean)

  return (
    <li
      className={`todo ${task.done ? 'is-done' : ''}`}
      style={category ? ({ '--cat': category.color } as React.CSSProperties) : undefined}
    >
      <button
        className={`check ${category ? 'has-cat' : ''}`}
        aria-label={task.done ? '완료 취소' : '완료'}
        onClick={() => toggleDone(task)}
      >
        {task.done ? '✓' : ''}
      </button>
      <button className="todo-main" onClick={onOpen}>
        <span className="todo-title">{task.title}</span>
        {(meta.length > 0 || task.occurrence || category) && (
          <span className="todo-meta">
            {meta.map((m) => (
              <span key={m as string} className={overdue ? 'overdue' : ''}>
                {m}
              </span>
            ))}
            {task.occurrence && <span title="반복">🔁</span>}
            {category && (
              <span className="cat-tag">
                <span className="cat-dot" />
                {category.name}
              </span>
            )}
          </span>
        )}
      </button>
      {!task.done && task.date && (
        <button className="link small" onClick={() => moveToNextDay(task)}>
          내일로 →
        </button>
      )}
    </li>
  )
}

function formatDate(key: string) {
  const today = todayKey()
  const d = fromKey(key)
  const diff = Math.round((d.getTime() - fromKey(today).getTime()) / 86400000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '내일'
  if (diff === -1) return '어제'
  const base = `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS_KO[d.getDay()]})`
  return d.getFullYear() === fromKey(today).getFullYear() ? base : `${d.getFullYear()}.${base}`
}
