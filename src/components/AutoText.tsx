import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onSave: (v: string) => void
  placeholder?: string
  multiline?: boolean
  className?: string
}

/** 입력하는 동안은 로컬 상태로 두고, 잠시 멈추거나 포커스가 빠지면 저장 */
export function AutoText({ value, onSave, placeholder, multiline, className }: Props) {
  const [text, setText] = useState(value)
  const focused = useRef(false)
  const timer = useRef<number | undefined>(undefined)

  // 다른 날짜로 넘어가거나 DB가 바뀌면 반영 (입력 중일 때는 덮어쓰지 않음)
  useEffect(() => {
    if (!focused.current) setText(value)
  }, [value])

  const change = (v: string) => {
    setText(v)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onSave(v), 500)
  }
  const flush = () => {
    focused.current = false
    window.clearTimeout(timer.current)
    if (text !== value) onSave(text)
  }

  const common = {
    className,
    placeholder,
    value: text,
    onFocus: () => (focused.current = true),
    onBlur: flush,
  }
  return multiline ? (
    <textarea {...common} rows={4} onChange={(e) => change(e.target.value)} />
  ) : (
    <input {...common} onChange={(e) => change(e.target.value)} />
  )
}
