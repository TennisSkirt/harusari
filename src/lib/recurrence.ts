import type { RepeatRule, Task } from './db'
import { addDays, fromKey } from './date'

export const REPEAT_LABELS: Record<RepeatRule['freq'], string> = {
  daily: '매일',
  weekdays: '평일',
  weekly: '매주',
  monthly: '매월',
  yearly: '매년',
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

export function describeRepeat(rule: RepeatRule, start?: string) {
  const d = start ? fromKey(start) : undefined
  let text = REPEAT_LABELS[rule.freq]
  if (rule.freq === 'weekly') {
    const days = rule.weekdays?.length ? rule.weekdays : d ? [d.getDay()] : []
    text += ' ' + [...days].sort().map((i) => WEEK[i]).join('·')
  }
  if (rule.freq === 'monthly' && d) text += ` ${d.getDate()}일`
  if (rule.freq === 'yearly' && d) text += ` ${d.getMonth() + 1}월 ${d.getDate()}일`
  if (rule.until) text += ` (~${rule.until.slice(2).replaceAll('-', '.')})`
  return text
}

/** 반복 원본(series)이 해당 날짜에 일정이 있는지 */
export function occursOn(task: Task, key: string): boolean {
  const rule = task.repeat
  if (!rule || !task.date) return false
  if (key < task.date) return false
  if (rule.until && key > rule.until) return false
  if (task.skip?.includes(key)) return false

  const day = fromKey(key)
  const start = fromKey(task.date)
  switch (rule.freq) {
    case 'daily':
      return true
    case 'weekdays':
      return day.getDay() >= 1 && day.getDay() <= 5
    case 'weekly': {
      const days = rule.weekdays?.length ? rule.weekdays : [start.getDay()]
      return days.includes(day.getDay())
    }
    case 'monthly':
      // 31일 반복은 31일이 없는 달에는 건너뜀
      return day.getDate() === start.getDate()
    case 'yearly':
      // 2/29 반복은 윤년에만
      return day.getMonth() === start.getMonth() && day.getDate() === start.getDate()
  }
}

/** from부터 최대 days일 안에서 다음 발생일 */
export function nextOccurrence(task: Task, from: string, days = 400): string | undefined {
  let key = task.date && task.date > from ? task.date : from
  for (let i = 0; i < days; i++) {
    if (task.repeat?.until && key > task.repeat.until) return undefined
    if (occursOn(task, key)) return key
    key = addDays(key, 1)
  }
  return undefined
}
