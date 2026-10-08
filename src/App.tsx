import { useState } from 'react'
import { SettingsSheet } from './components/SettingsSheet'
import { useApplySettings, useSettings } from './lib/settings'
import { TodayPage } from './pages/TodayPage'

const TABS = [
  { id: 'today', label: '오늘', icon: '📖' },
  { id: 'planner', label: '플래너', icon: '📒' },
  { id: 'calendar', label: '캘린더', icon: '🗓' },
  { id: 'todo', label: '투두', icon: '✅' },
  { id: 'memo', label: '메모', icon: '📝' },
] as const

type TabId = (typeof TABS)[number]['id']

const COMING: Record<Exclude<TabId, 'today'>, string> = {
  planner: '데일리 · 위클리 플래너',
  calendar: '연간 · 월간 캘린더, 공휴일, D-day, 기념일',
  todo: '오늘 / 예정 / 언젠가 / 완료 목록',
  memo: '서식 메모, 스티키 메모, 폴더, 검색',
}

export default function App() {
  const settings = useSettings()
  useApplySettings(settings)
  const [tab, setTab] = useState<TabId>('today')
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="app">
      <nav className="tabs">
        <div className="brand">하루살이</div>
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
        <button className="tab tab-settings" onClick={() => setShowSettings(true)}>
          <span className="tab-icon">⚙️</span>
          <span className="tab-label">설정</span>
        </button>
      </nav>

      <main className="main">
        {tab === 'today' ? (
          <TodayPage />
        ) : (
          <div className="page coming">
            <h2>{TABS.find((t) => t.id === tab)!.label}</h2>
            <p>{COMING[tab]}</p>
            <p className="muted">다음 단계에서 만들어질 예정이에요.</p>
          </div>
        )}
      </main>

      {showSettings && <SettingsSheet onClose={() => setShowSettings(false)} />}
    </div>
  )
}
