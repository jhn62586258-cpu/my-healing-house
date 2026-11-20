import { useEffect, useRef, useState } from 'react'
import { useStore, setState, OUTFITS, LETTERS, SPOTS, START, toggleView, openLetter, teleport, showToast, world, nearestActor, doAction, toggleSit } from '../store'
import { ensureAudio, paper } from '../audio/AsmrEngine'

/* ───────── 라인 아이콘 (SVG) ───────── */
const I = {
  exit: (
    <svg viewBox="0 0 24 24">
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 8l-4 4 4 4M6 12h10" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24">
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v9h5v-5h4v5h5v-9" />
    </svg>
  ),
  chev: (
    <svg viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  sound: (
    <svg viewBox="0 0 24 24">
      <path d="M4 10v4h4l5 4V6L8 10H4z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  ),
  mute: (
    <svg viewBox="0 0 24 24">
      <path d="M4 10v4h4l5 4V6L8 10H4z" />
      <path d="M17 10l4 4M21 10l-4 4" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  rain: (
    <svg viewBox="0 0 24 24">
      <path d="M7 15a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8a3.5 3.5 0 0 1 .5 7H7z" />
      <path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" />
    </svg>
  ),
  sliders: (
    <svg viewBox="0 0 24 24">
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  ),
  sit: (
    <svg viewBox="0 0 24 24">
      <path d="M12 3c-1.5 2.5-1.5 4.5 0 6 1.5-1.5 1.5-3.5 0-6z" />
      <path d="M12 9c-3-.5-5.5.5-7 3 2.5 1 5 .5 7-3zM12 9c3-.5 5.5.5 7 3-2.5 1-5 .5-7-3z" />
      <path d="M5 16c2 2 4.5 3 7 3s5-1 7-3" />
    </svg>
  ),
  talk: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="9" r="4" />
      <path d="M5 20c1-3.5 3.8-5 7-5s6 1.5 7 5" />
      <path d="M17 4.5a6 6 0 0 1 2 3.5" />
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
      <circle cx="12" cy="12" r="1.6" />
    </svg>
  ),
}

/* ───────── 가상 조이스틱 ───────── */
function Joystick() {
  const base = useRef()
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false })
  const id = useRef(null)
  const R = 46
  const update = (e) => {
    const r = base.current.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const d = Math.hypot(dx, dy)
    if (d > R) {
      dx = (dx / d) * R
      dy = (dy / d) * R
    }
    world.joy.x = dx / R
    world.joy.y = dy / R
    setKnob({ x: dx, y: dy, active: true })
  }
  const end = (e) => {
    if (e.pointerId !== id.current) return
    id.current = null
    world.joy.x = 0
    world.joy.y = 0
    setKnob({ x: 0, y: 0, active: false })
  }
  return (
    <div
      ref={base}
      className={'joy glass' + (knob.active ? ' active' : '')}
      onPointerDown={(e) => {
        e.stopPropagation()
        id.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e)
      }}
      onPointerMove={(e) => e.pointerId === id.current && update(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="joy-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  )
}

/* 가장 가까운 대화 상대 / 사물 이름 */
const shortName = (a) => (a ? a.label.replace(/\(.*\)/, '').trim().split(' ').pop() : '')
function useNearby() {
  const [near, setNear] = useState({ talk: '', obj: '' })
  useEffect(() => {
    const t = setInterval(() => {
      const talk = shortName(nearestActor('talk', 3.4))
      const obj = shortName(nearestActor('object', 2.9))
      setNear((n) => (n.talk === talk && n.obj === obj ? n : { talk, obj }))
    }, 300)
    return () => clearInterval(t)
  }, [])
  return near
}

function PlaceMenu() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])
  return (
    <div className="place" onPointerDown={(e) => e.stopPropagation()}>
      <button className="glass pill" onClick={() => setOpen(!open)}>
        <span className="ic">{I.home}</span>
        <span className="pill-label">우리 시골집</span>
        <span className={'ic chev' + (open ? ' up' : '')}>{I.chev}</span>
      </button>
      {open && (
        <div className="glass menu">
          {Object.entries(SPOTS).map(([k, s]) => (
            <button
              key={k}
              onClick={() => {
                teleport(s)
                setOpen(false)
                showToast(`📍 ${s.label}(으)로 이동했어요`, 1500)
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Settings() {
  const [open, setOpen] = useState(false)
  const outfit = useStore((s) => s.outfit)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])
  return (
    <div className="settings" onPointerDown={(e) => e.stopPropagation()}>
      <button className="tb" onClick={() => setOpen(!open)} aria-label="설정">
        <span className="ic">{I.sliders}</span>
      </button>
      {open && (
        <div className="glass menu right">
          <div className="menu-title">반바지 색상</div>
          <div className="swatches">
            {OUTFITS.map((o, i) => (
              <button key={o.name} className={'swatch' + (i === outfit ? ' on' : '')} style={{ background: o.shorts }} title={o.name} onClick={() => setState({ outfit: i })} />
            ))}
          </div>
          <div className="menu-tip">PC: WASD·방향키 이동 / 드래그로 둘러보기 / V 시점 전환</div>
        </div>
      )}
    </div>
  )
}

export default function UI() {
  const started = useStore((s) => s.started)
  const view = useStore((s) => s.view)
  const rainOn = useStore((s) => s.rainOn)
  const bgmOn = useStore((s) => s.bgmOn)
  const sitting = useStore((s) => s.sitting)
  const hint = useStore((s) => s.hint)
  const toast = useStore((s) => s.toast)
  const letter = useStore((s) => s.letter)
  const near = useNearby()

  if (!started) {
    return (
      <div className="intro">
        <div className="glass intro-card">
          <div className="intro-badge">🏡</div>
          <h1>우리 시골집</h1>
          <p className="sub">햇살 좋은 오후, 엄마 아빠가 기다리는 집</p>
          <ul>
            <li>왼쪽 아래 조이스틱 또는 바닥 터치로 이동</li>
            <li>화면을 드래그하면 둘러볼 수 있어요</li>
            <li>🔊 표시가 떠 있는 물건을 터치하면 ASMR이 잠시 들려요</li>
            <li>아래 버튼으로 앉기 · 대화하기 · 상호작용</li>
          </ul>
          <button
            className="enter"
            onClick={() => {
              ensureAudio()
              setState({ started: true })
            }}
          >
            집으로 들어가기
          </button>
          <small>이어폰을 끼면 더 좋아요 🎧</small>
        </div>
      </div>
    )
  }

  return (
    <div className="ui-root">
      {/* 좌측 상단 */}
      <div className="tl">
        <button
          className="glass round"
          aria-label="처음 자리로"
          onClick={() => {
            teleport(START)
            setState({ letter: -1 })
            showToast('🏠 처음 자리(마루)로 돌아왔어요', 1600)
          }}
        >
          <span className="ic">{I.exit}</span>
        </button>
        <PlaceMenu />
      </div>

      {/* 우측 상단 */}
      <div className="tr glass">
        <button className={'tb' + (bgmOn ? '' : ' off')} onClick={() => setState({ bgmOn: !bgmOn })} aria-label="배경음">
          <span className="ic">{bgmOn ? I.sound : I.mute}</span>
          <span className="tb-label">{bgmOn ? '배경음' : '음소거'}</span>
        </button>
        <span className="sep" />
        <button className="tb" onClick={toggleView} aria-label="시점 전환">
          <span className="ic">{I.eye}</span>
          <span className="tb-label">{view === 'first' ? '1인칭' : '3인칭'}</span>
        </button>
        <span className="sep" />
        <button className="tb" onClick={() => setState({ rainOn: !rainOn })} aria-label="날씨">
          <span className="ic">{rainOn ? I.rain : I.sun}</span>
          <span className="tb-label">{rainOn ? '비 오는 저녁' : '햇살 오후'}</span>
        </button>
        <span className="sep" />
        <Settings />
      </div>

      {toast && <div className="glass toast">{toast}</div>}
      {hint && !toast && <div className="glass hint">{hint}</div>}

      <Joystick />

      {/* 하단 액션 바 */}
      <div className="actions glass">
        <button className={sitting ? 'on' : ''} onClick={toggleSit}>
          <span className="ic">{I.sit}</span>
          <span>{sitting ? '일어나기' : '앉기'}</span>
        </button>
        <span className="vsep" />
        <button className={near.talk ? 'ready' : ''} onClick={() => doAction('talk')}>
          <span className="ic">{I.talk}</span>
          <span>대화하기</span>
          {near.talk && <em>{near.talk}</em>}
        </button>
        <span className="vsep" />
        <button className={near.obj ? 'ready' : ''} onClick={() => doAction('object')}>
          <span className="ic">{I.spark}</span>
          <span>상호작용</span>
          {near.obj && <em>{near.obj}</em>}
        </button>
      </div>

      {letter >= 0 && (
        <div className="letter-bg" onClick={() => setState({ letter: -1 })}>
          <div className="letter" onClick={(e) => e.stopPropagation()}>
            <div className="stamp">💌</div>
            <p className="to">사랑하는 우리 강아지에게</p>
            <p className="msg">{LETTERS[letter]}</p>
            <p className="from">— 엄마가</p>
            <div className="letter-btns">
              <button
                onClick={() => {
                  paper()
                  openLetter()
                }}
              >
                ✉️ 다른 편지 꺼내보기
              </button>
              <button className="ghost" onClick={() => setState({ letter: -1 })}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
