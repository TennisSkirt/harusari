import { FONTS, setSetting, useSettings, type FontKey, type ThemeMode } from '../lib/settings'
import { CategoryManager } from './CategoryPicker'
import { Sheet } from './Sheet'

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: '시스템' },
  { id: 'light', label: '라이트' },
  { id: 'dark', label: '다크' },
]

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const s = useSettings()
  const hours = Array.from({ length: 25 }, (_, i) => i)

  return (
    <Sheet title="설정" onClose={onClose}>
      <div className="form">
        <div className="field">
          <span>화면 모드</span>
          <div className="segmented">
            {THEMES.map((t) => (
              <button key={t.id} className={s.theme === t.id ? 'is-active' : ''} onClick={() => setSetting('theme', t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <FontPicker label="제목 글꼴" value={s.headingFont} onChange={(v) => setSetting('headingFont', v)} />
        <FontPicker label="본문 글꼴" value={s.bodyFont} onChange={(v) => setSetting('bodyFont', v)} />

        <div className="field">
          <span>타임라인</span>
          <select
            className="input"
            value={s.timelineStart}
            onChange={(e) => setSetting('timelineStart', Math.min(Number(e.target.value), s.timelineEnd - 1))}
          >
            {hours.slice(0, 24).map((h) => (
              <option key={h} value={h}>
                {h}시
              </option>
            ))}
          </select>
          <span className="muted">~</span>
          <select
            className="input"
            value={s.timelineEnd}
            onChange={(e) => setSetting('timelineEnd', Math.max(Number(e.target.value), s.timelineStart + 1))}
          >
            {hours.slice(1).map((h) => (
              <option key={h} value={h}>
                {h}시
              </option>
            ))}
          </select>
        </div>

        <div className="settings-section">
          <h3>카테고리</h3>
          <CategoryManager />
        </div>
      </div>
    </Sheet>
  )
}

function FontPicker({ label, value, onChange }: { label: string; value: FontKey; onChange: (v: FontKey) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value as FontKey)}
        style={{ fontFamily: FONTS[value].css }}
      >
        {(Object.keys(FONTS) as FontKey[]).map((k) => (
          <option key={k} value={k}>
            {FONTS[k].label}
          </option>
        ))}
      </select>
    </label>
  )
}
