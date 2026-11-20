import { useState } from 'react'
import { useStore, setState, OUTFITS, teleport, toggleView, toggleRain, refillBubbles } from '../store'
import { ensureAudio } from '../audio/AsmrEngine'

const MIX = [
  { k: 'rain', icon: '🌧️', label: '빗소리' },
  { k: 'stew', icon: '🍲', label: '보글보글' },
  { k: 'leaves', icon: '🍂', label: '바스락' },
]
const TABS = [
  { k: 'room', label: '🧸 내 방' },
  { k: 'living', label: '🍲 거실·부엌' },
  { k: 'yard', label: '🍂 툇마루·마당' },
]

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function UI() {
  const started = useStore((s) => s.started)
  const view = useStore((s) => s.view)
  const outfit = useStore((s) => s.outfit)
  const uiHidden = useStore((s) => s.uiHidden)
  const zone = useStore((s) => s.zone)
  const hint = useStore((s) => s.hint)
  const toast = useStore((s) => s.toast)
  const mixer = useStore((s) => s.mixer)
  const timer = useStore((s) => s.timer)
  const rainLevel = useStore((s) => s.rainLevel)
  const [open, setOpen] = useState(true)

  const setMix = (k, patch) => setState((st) => ({ mixer: { ...st.mixer, [k]: { ...st.mixer[k], ...patch } } }))

  if (!started) {
    return (
      <div className="intro">
        <div className="glass intro-card">
          <h1>🏡 시골집 아지트</h1>
          <p className="sub">나만의 힐링의 존</p>
          <ul>
            <li>WASD / 방향키 / 바닥 클릭 → 아장아장 걷기</li>
            <li>화면 드래그 → 시선·카메라 회전 (Q/E 도 가능)</li>
            <li>반짝이는 물건을 클릭·드래그 → ASMR 🎧</li>
            <li>V 시점 전환 · H UI 숨기기(멍때리기)</li>
          </ul>
          <button
            className="btn big"
            onClick={() => {
              ensureAudio()
              setState({ started: true })
            }}
          >
            🌧️ 아지트로 들어가기
          </button>
          <small>이어폰을 끼면 더 좋아요</small>
        </div>
      </div>
    )
  }

  if (uiHidden) {
    return (
      <div className="ui-root">
        <button className="ghost-btn" title="UI 다시 보기 (H)" onClick={() => setState({ uiHidden: false })}>
          🫥
        </button>
      </div>
    )
  }

  return (
    <div className="ui-root">
      <div className="glass top-left">
        <b>🏡 시골집 아지트</b>
        <span>나만의 힐링의 존</span>
      </div>

      <div className="top-right">
        <button className="btn glass" onClick={toggleView}>
          👁️ 시점 전환 <small>{view === 'first' ? '1인칭' : '3인칭'}</small>
        </button>
        <div className="glass swatches" title="수면바지 · 양말 색상">
          {OUTFITS.map((o, i) => (
            <button
              key={o.name}
              className={'swatch' + (i === outfit ? ' on' : '')}
              style={{ background: `linear-gradient(135deg, ${o.pants} 55%, ${o.sock} 55%)` }}
              title={o.name}
              onClick={() => setState({ outfit: i })}
            />
          ))}
        </div>
      </div>

      {hint && <div className="glass hint">{hint}</div>}
      {toast && <div className="glass toast">{toast}</div>}

      <div className="glass mixer">
        <div className="mixer-head">
          <b>🎛️ 힐링 믹서</b>
          <button className="mini" onClick={() => setOpen(!open)}>
            {open ? '접기' : '펼치기'}
          </button>
        </div>
        {open && (
          <>
            {MIX.map((m) => (
              <div className="mix-row" key={m.k}>
                <button className={'toggle' + (mixer[m.k].on ? ' on' : '')} onClick={() => setMix(m.k, { on: !mixer[m.k].on })}>
                  {m.icon}
                </button>
                <span className="mix-label">{m.label}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={mixer[m.k].vol}
                  onChange={(e) => setMix(m.k, { vol: parseFloat(e.target.value) })}
                  onPointerUp={(e) => e.currentTarget.blur()}
                />
              </div>
            ))}
            <div className="row-btns">
              <button className="mini wide" onClick={toggleRain}>
                {rainLevel === 1 ? '☔ 가랑비 → 장대비' : '🌧️ 장대비 → 가랑비'}
              </button>
              <button className="mini wide" onClick={refillBubbles}>
                🫧 새 뽁뽁이 리필
              </button>
            </div>
            <div className="timer">
              <div className="time">⏱️ {fmt(timer.left)}</div>
              <div className="bar">
                <i style={{ width: `${((1500 - timer.left) / 1500) * 100}%` }} />
              </div>
              <div className="row-btns">
                <button className="mini wide" onClick={() => setState((s) => ({ timer: { ...s.timer, running: !s.timer.running } }))}>
                  {timer.running ? '⏸ 멈춤' : '▶ 25분 집중'}
                </button>
                <button className="mini wide" onClick={() => setState({ timer: { running: false, left: 1500 } })}>
                  ↺ 리셋
                </button>
              </div>
            </div>
            <button className="mini wide full" onClick={() => setState({ uiHidden: true })}>
              🫥 UI 숨기기 (멍때리기)
            </button>
          </>
        )}
      </div>

      <div className="glass tabs">
        {TABS.map((t) => (
          <button key={t.k} className={'tab' + (zone === t.k ? ' on' : '')} onClick={() => teleport(t.k)}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
