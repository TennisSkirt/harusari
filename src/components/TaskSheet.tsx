import { useState } from 'react'
import { addTask, removeTask, updateTask, type Task } from '../lib/db'
import { Sheet } from './Sheet'

interface Props {
  /** 수정할 할 일. 없으면 새로 만들기 */
  task?: Task
  defaults?: Partial<Pick<Task, 'date' | 'startTime' | 'endTime'>>
  onClose: () => void
}

export function TaskSheet({ task, defaults, onClose }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [date, setDate] = useState(task?.date ?? defaults?.date ?? '')
  const [timed, setTimed] = useState(Boolean(task?.startTime ?? defaults?.startTime))
  const [startTime, setStartTime] = useState(task?.startTime ?? defaults?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(task?.endTime ?? defaults?.endTime ?? '10:00')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const data = {
      title: title.trim(),
      date: date || undefined,
      startTime: timed && date ? startTime : undefined,
      endTime: timed && date ? (endTime > startTime ? endTime : undefined) : undefined,
    }
    if (task) await updateTask(task.id, data)
    else await addTask(data)
    onClose()
  }

  return (
    <Sheet title={task ? '할 일 수정' : '새 할 일'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <input
          className="input input-lg"
          placeholder="무엇을 할까요?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
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
        <div className="form-actions">
          {task && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                await removeTask(task.id)
                onClose()
              }}
            >
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
