import { useState } from 'react'
import { addCategory, CATEGORY_COLORS, removeCategory, updateCategory, type Category } from '../lib/db'
import { useCategories } from '../lib/tasks'

/** 할 일 시트에서 쓰는 카테고리 선택 칩 */
export function CategoryPicker({ value, onChange }: { value?: string; onChange: (id?: string) => void }) {
  const cats = useCategories()
  const [adding, setAdding] = useState(false)

  return (
    <div className="chips">
      <button type="button" className={`chip ${!value ? 'is-on' : ''}`} onClick={() => onChange(undefined)}>
        없음
      </button>
      {cats.map((c) => (
        <button
          type="button"
          key={c.id}
          className={`chip cat-chip ${value === c.id ? 'is-on' : ''}`}
          style={{ '--cat': c.color } as React.CSSProperties}
          onClick={() => onChange(c.id)}
        >
          <span className="cat-dot" />
          {c.name}
        </button>
      ))}
      {adding ? (
        <NewCategory
          onDone={(id) => {
            setAdding(false)
            if (id) onChange(id)
          }}
        />
      ) : (
        <button type="button" className="chip chip-add" onClick={() => setAdding(true)}>
          ＋ 새 카테고리
        </button>
      )}
    </div>
  )
}

function NewCategory({ onDone }: { onDone: (id?: string) => void }) {
  const cats = useCategories()
  const [name, setName] = useState('')
  const [color, setColor] = useState(CATEGORY_COLORS[cats.length % CATEGORY_COLORS.length])

  const save = async () => {
    if (!name.trim()) return onDone()
    onDone(await addCategory(name.trim(), color))
  }

  return (
    <div className="new-cat">
      <input
        className="input"
        placeholder="이름 (예: 업무)"
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            save()
          }
        }}
      />
      <ColorRow value={color} onChange={setColor} />
      <div className="new-cat-actions">
        <button type="button" className="link" onClick={() => onDone()}>
          취소
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={save}>
          만들기
        </button>
      </div>
    </div>
  )
}

export function ColorRow({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="color-row">
      {CATEGORY_COLORS.map((c) => (
        <button
          type="button"
          key={c}
          className={`swatch ${value === c ? 'is-on' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={`색 ${c}`}
        />
      ))}
    </div>
  )
}

/** 설정 화면의 카테고리 관리 */
export function CategoryManager() {
  const cats = useCategories()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <div className="cat-manager">
      {cats.length === 0 && !adding && <p className="muted small">아직 카테고리가 없어요.</p>}
      {cats.map((c) =>
        editing === c.id ? (
          <EditCategory key={c.id} cat={c} onDone={() => setEditing(null)} />
        ) : (
          <div key={c.id} className="cat-row" style={{ '--cat': c.color } as React.CSSProperties}>
            <span className="cat-dot" />
            <span className="cat-name">{c.name}</span>
            <button className="link small" onClick={() => setEditing(c.id)}>
              수정
            </button>
          </div>
        ),
      )}
      {adding ? (
        <NewCategory onDone={() => setAdding(false)} />
      ) : (
        <button className="chip chip-add" onClick={() => setAdding(true)}>
          ＋ 새 카테고리
        </button>
      )}
    </div>
  )
}

function EditCategory({ cat, onDone }: { cat: Category; onDone: () => void }) {
  const [name, setName] = useState(cat.name)
  const [color, setColor] = useState(cat.color)
  return (
    <div className="new-cat">
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      <ColorRow value={color} onChange={setColor} />
      <div className="new-cat-actions">
        <button
          type="button"
          className="link danger"
          onClick={async () => {
            if (confirm(`'${cat.name}' 카테고리를 삭제할까요? 할 일은 그대로 남아요.`)) {
              await removeCategory(cat.id)
              onDone()
            }
          }}
        >
          삭제
        </button>
        <button type="button" className="link" onClick={onDone}>
          취소
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={async () => {
            if (name.trim()) await updateCategory(cat.id, { name: name.trim(), color })
            onDone()
          }}
        >
          저장
        </button>
      </div>
    </div>
  )
}
