import { useState } from 'react'
import { addTask, removeTask, updateTask, type RepeatFreq, type RepeatRule, type TaskInput } from '../lib/db'
import { fromKey, WEEKDAYS_KO } from '../lib/date'
import { describeRepeat, REPEAT_LABELS } from '../lib/recurrence'
import { deleteOccurrence, editOccurrence, type Scope, type TaskItem } from '../lib/tasks'
import { CategoryPicker } from './CategoryPicker'
import { Sheet } from './Sheet'

interface Props {
  /** 수정할 할 일. 없으면 새로 만들기 */
  task?: TaskItem
  defaults?: Partial<Pick<TaskItem, 'date' | 'startTime' | 'endTime' | 'categoryId'>>
  onClose: () => void
}

type Pending = { kind: 'save'; data: TaskInput } | { kind: 'delete' } | null

export function TaskSheet({ task, defaults, onClose }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [date, setDate] = useState(task?.date ?? defaults?.date ?? '')
  const [timed, setTimed] = useState(Boolean(task?.startTime ?? defaults?.startTime))
  const [startTime, setStartTime] = useState(task?.startTime ?? defaults?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(task?.endTime ?? defaults?.endTime ?? '10:00')
  const [categoryId, setCategoryId] = useState(task?.categoryId ?? defaults?.categoryId)
  const [freq, setFreq] = useState<RepeatFreq | ''>(task?.repeat?.freq ?? '')
  const [weekdays, setWeekdays] = useState<number[]>(task?.repeat?.weekdays ?? [])
  const [until, setUntil] = useState(task?.repeat?.until ?? '')
  const [pending, setPending] = useState<Pending>(null)

  const isOccurrence = Boolean(task?.occurrence)
  const startDay = date ? fromKey(date).getDay() : 0

  const buildRepeat = (): RepeatRule | undefined => {
    if (!freq || !date) return undefined
    const rule: RepeatRule = { freq }
    if (freq === 'weekly') rule.weekdays = weekdays.length ? weekdays : [startDay]
    if (until && until >= date) rule.until = until
    return rule
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const data: TaskInput = {
      title: title.trim(),
      date: date || undefined,
      startTime: timed && date ? startTime : undefined,
      endTime: timed && date && endTime > startTime ? endTime : undefined,
      categoryId,
      repeat: buildRepeat(),
    }
    if (isOccurrence) return setPending({ kind: 'save', data })
    if (task) await updateTask(task.id, data)
    else await addTask(data)
    onClose()
  }

  const remove = async () => {
    if (!task) return
    if (isOccurrence) return setPending({ kind: 'delete' })
    await removeTask(task.id)
    onClose()
  }

  const applyScope = async (scope: Scope) => {
    if (!task || !pending) return
    if (pending.kind === 'save') await editOccurrence(task, pending.data, scope)
    else await deleteOccurrence(task, scope)
    onClose()
  }

  if (pending) {
    return (
      <Sheet title={pending.kind === 'save' ? '반복 일정 수정' : '반복 일정 삭제'} onClose={() => setPending(null)}>
        <p className="muted">어디까지 {pending.kind === 'save' ? '바꿀까요' : '지울까요'}?</p>
        <div className="scope-actions">
          <button className="btn btn-outline" onClick={() => applyScope('one')}>
            이 일정만
          </button>
          <button className="btn btn-primary" onClick={() => applyScope('following')}>
            이 일정과 이후 전체
          </button>
          <button className="link" onClick={() => setPending(null)}>
            취소
          </button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title={task ? '할 일 수정' : '새 할 일'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <input
          className="input input-lg"
          placeholder="무엇을 할까요?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus={!task}
        />

        <div className="field">
          <span>카테고리</span>
          <CategoryPicker value={categoryId} onChange={setCategoryId} />
        </div>

        <label className="field">
          <span>날짜</span>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          {date && (
            <button type="button" className="link" onClick={() => setDate('')}>
              언젠가로
            </button>
          )}
        </label>

        {date && (
          <label className="field">
            <span>시간 지정</span>
            <input type="checkbox" className="toggle" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
          </label>
        )}
        {date && timed && (
          <div className="field">
            <span>시간</span>
            <input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <span className="muted">~</span>
            <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        )}

        {date && (
          <div className="field">
            <span>반복</span>
            <select className="input" value={freq} onChange={(e) => setFreq(e.target.value as RepeatFreq | '')}>
              <option value="">안 함</option>
              {(Object.keys(REPEAT_LABELS) as RepeatFreq[]).map((f) => (
                <option key={f} value={f}>
                  {REPEAT_LABELS[f]}
                </option>
              ))}
            </select>
          </div>
        )}
        {date && freq === 'weekly' && (
          <div className="field">
            <span>요일</span>
            <div className="chips">
              {WEEKDAYS_KO.map((w, i) => {
                const on = weekdays.length ? weekdays.includes(i) : i === startDay
                return (
                  <button
                    type="button"
                    key={w}
                    className={`chip day-chip w${i} ${on ? 'is-on' : ''}`}
                    onClick={() => {
                      const cur = weekdays.length ? weekdays : [startDay]
                      const next = on ? cur.filter((d) => d !== i) : [...cur, i]
                      if (next.length) setWeekdays(next)
                    }}
                  >
                    {w}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {date && freq && (
          <div className="field">
            <span>반복 종료</span>
            <input type="date" className="input" value={until} min={date} onChange={(e) => setUntil(e.target.value)} />
            {until ? (
              <button type="button" className="link" onClick={() => setUntil('')}>
                계속 반복
              </button>
            ) : (
              <span className="muted small">비워두면 계속</span>
            )}
          </div>
        )}
        {date && freq && <p className="repeat-summary">🔁 {describeRepeat(buildRepeat()!, date)}</p>}

        <div className="form-actions">
          {task && (
            <button type="button" className="btn btn-danger" onClick={remove}>
              삭제
            </button>
          )}
          <button type="submit" className="btn btn-primary">
            {task ? '저장' : '추가'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
