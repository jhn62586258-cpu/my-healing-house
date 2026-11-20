import { useStore, setState, OUTFITS, LETTERS, toggleView, openLetter } from '../store'
import { ensureAudio, paper } from '../audio/AsmrEngine'

export default function UI() {
  const started = useStore((s) => s.started)
  const view = useStore((s) => s.view)
  const outfit = useStore((s) => s.outfit)
  const rainOn = useStore((s) => s.rainOn)
  const hint = useStore((s) => s.hint)
  const toast = useStore((s) => s.toast)
  const letter = useStore((s) => s.letter)

  if (!started) {
    return (
      <div className="intro">
        <div className="intro-card">
          <h1>🏡 시골집 아지트</h1>
          <p className="sub">햇살 좋은 오후, 엄마 아빠가 기다리는 우리 집</p>
          <ul>
            <li>👆 바닥을 탭하면 아장아장 걸어가요 (PC: WASD·방향키)</li>
            <li>🖐️ 화면을 드래그하면 둘러볼 수 있어요</li>
            <li>✨ 반짝이는 물건, 가족, 강아지를 직접 터치해 보세요</li>
            <li>🚪 유리문 쪽으로 걸어가면 스르륵 열려요</li>
            <li>🌧️ 오른쪽 위 버튼으로 비 오는 저녁으로 바꿀 수 있어요</li>
          </ul>
          <button
            className="enter"
            onClick={() => {
              ensureAudio()
              setState({ started: true })
            }}
          >
            🏡 집으로 들어가기
          </button>
          <small>이어폰을 끼면 더 좋아요 🎧</small>
        </div>
      </div>
    )
  }

  return (
    <div className="ui-root">
      <div className="topbar">
        <button className={'chip' + (rainOn ? ' on' : '')} onClick={() => setState({ rainOn: !rainOn })} aria-label="맑은 낮 / 비 오는 저녁 전환">
          {rainOn ? '🌧️' : '☀️'}
          <span>{rainOn ? '비 오는 저녁' : '맑은 오후'}</span>
        </button>
        <button className="chip" onClick={toggleView} aria-label="시점 전환">
          👁️<span>{view === 'first' ? '1인칭' : '3인칭'}</span>
        </button>
        <div className="chip swatches" aria-label="반바지 색상">
          {OUTFITS.map((o, i) => (
            <button key={o.name} className={'swatch' + (i === outfit ? ' on' : '')} style={{ background: o.shorts }} title={`반바지 ${o.name}`} onClick={() => setState({ outfit: i })} />
          ))}
        </div>
      </div>

      {hint && <div className="hint">{hint}</div>}
      {toast && <div className="toast">{toast}</div>}

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
