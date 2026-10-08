import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from './db'

export type ThemeMode = 'system' | 'light' | 'dark'

export const FONTS = {
  gaegu: { label: '개구 (손글씨)', css: "'Gaegu', cursive" },
  nanumPen: { label: '나눔펜 (손글씨)', css: "'Nanum Pen Script', cursive" },
  gowun: { label: '고운돋움', css: "'Gowun Dodum', sans-serif" },
  pretendard: { label: '프리텐다드 (고딕)', css: "'Pretendard Variable', Pretendard, sans-serif" },
  noto: { label: '본고딕 (Noto Sans)', css: "'Noto Sans KR', sans-serif" },
} as const

export type FontKey = keyof typeof FONTS

export interface Settings {
  theme: ThemeMode
  headingFont: FontKey
  bodyFont: FontKey
  timelineStart: number
  timelineEnd: number
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  headingFont: 'gaegu',
  bodyFont: 'pretendard',
  timelineStart: 6,
  timelineEnd: 24,
}

export function useSettings(): Settings {
  const rows = useLiveQuery(() => db.settings.toArray(), [])
  const merged = { ...DEFAULT_SETTINGS }
  for (const r of rows ?? []) (merged as Record<string, unknown>)[r.key] = r.value
  return merged
}

export const setSetting = <K extends keyof Settings>(key: K, value: Settings[K]) =>
  db.settings.put({ key, value })

/** 설정값을 문서 루트(data-theme, 폰트 변수)에 반영 */
export function useApplySettings(s: Settings) {
  useEffect(() => {
    const root = document.documentElement
    if (s.theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', s.theme)
    root.style.setProperty('--font-heading', FONTS[s.headingFont].css)
    root.style.setProperty('--font-body', FONTS[s.bodyFont].css)
  }, [s.theme, s.headingFont, s.bodyFont])
}
