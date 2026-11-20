import { useEffect, useRef, useSyncExternalStore } from 'react'
import * as audio from './audio/AsmrEngine'

/* ───────── 반바지 색상 프리셋 ───────── */
export const OUTFITS = [
  { name: '차콜', shorts: '#3b3a3c' },
  { name: '네이비', shorts: '#2f3d55' },
  { name: '카키', shorts: '#5b5e45' },
  { name: '브라운', shorts: '#5a4636' },
]

/* ───────── 엄마의 편지 20가지 ───────── */
export const LETTERS = [
  '오늘도 힘내! 네가 최고야.',
  '너무 무리하지 마, 충분히 잘하고 있어.',
  '얼른 와, 따뜻한 밥 해놓고 기다리고 있어.',
  '항상 네 곁에 있어.',
  '힘들 땐 언제든 집에 와. 문은 늘 열려 있단다.',
  '밥은 꼭 챙겨 먹고 다니렴. 그게 엄마 소원이야.',
  '네가 웃으면 엄마는 하루 종일 행복해.',
  '실수해도 괜찮아. 다들 그러면서 크는 거야.',
  '오늘 하루도 정말 수고 많았어, 우리 강아지.',
  '비 오는 날엔 우산 꼭 챙기고, 감기 조심해.',
  '너는 존재만으로도 엄마한테 큰 선물이야.',
  '천천히 가도 돼. 늦어도 결국 다 잘될 거야.',
  '잠 푹 자고 일어나면 내일은 더 괜찮을 거야.',
  '엄마는 언제나 네 편이야. 잊지 마.',
  '네가 고른 길이면 엄마는 무조건 응원해.',
  '가끔은 아무것도 안 해도 괜찮아. 쉬는 것도 용기야.',
  '감 따 놨다. 주말에 와서 같이 먹자.',
  '아빠가 너 보고 싶다고 TV만 보고 계신다 ㅎㅎ',
  '세상에서 제일 소중한 우리 아가, 사랑해.',
  '오늘의 너도, 내일의 너도 엄마는 다 자랑스러워.',
]

export const MOM_LINES = ['밥 먹어~ 얼른 와!', '오늘도 고생 많았어 우리 강아지', '찌개 다 끓었다~', '손 씻고 와~ 반찬 많이 했어', '감기 걸릴라, 따뜻하게 입어']
export const DAD_LINES = ['왔어~?', '밥 먹고 쉬어라', '오늘 하루 어땠어?', '이리 와서 같이 TV 볼래?', '우리 강아지 왔네~']

/* ───────── 아주 작은 전역 스토어 ───────── */
let state = {
  started: false,
  view: 'third', // 'third' | 'first'
  outfit: 0,
  rainOn: false, // 기본: 햇살 오후 4시 / 토글: 비 오는 저녁
  bgmOn: true, // 배경음 (낮: 새소리·바람 / 비: 빗소리)
  stewOn: false,
  kettleOn: false,
  sitting: false,
  hint: '',
  toast: '',
  letter: -1, // 열린 편지 번호 (-1 = 닫힘)
}
const listeners = new Set()
export const getState = () => state
export const setState = (patch) => {
  const next = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export function useStore(selector) {
  return useSyncExternalStore(subscribe, () => selector(state))
}

let toastTimer
export function showToast(msg, ms = 2200) {
  setState({ toast: msg })
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => setState({ toast: '' }), ms)
}

/* ───────── 집 치수 (단위 m) ─────────
   시안 구도: 카메라는 남쪽(+z)에서 북쪽(-z)을 바라봄
   본채       x -4 ~ 5.2,  z -6 ~ 4.4  (서쪽 x=-4 벽 전체가 통유리 샷시, 미닫이문)
     · 거실   x -4 ~ 1.4,  z -6 ~ -1   (소파·아빠, TV, 장작난로+양은주전자, 러그+푸들)
     · 마루   x -4 ~ 1.4,  z -1 ~ 4.4  (대나무 돗자리)
     · 부엌   x 1.4 ~ 5.2, z -6 ~ -1.5 (엄마, 뚝배기) + 식탁 (z 1.5 ~ 3.5)
   내 방      x 5.2 ~ 9,   z -4 ~ 3    (노란 격자 미닫이문, 책상 밑 아지트)
   앞마당     x -11.5 ~ -4 (처마 x -7.5 ~ -4, 초록 철제 기둥)
   창고채(ㄱ) x -11.6 ~ -4, z -9.6 ~ -6.4                                   */
export const FLOOR = 0.45
export const DOORS = {
  main: { axis: 'x', x: -4, z0: -0.2, z1: 2.6, out: [-4.95, 1.2], in: [-3.05, 1.2] },
  room: { axis: 'x', x: 5.2, z0: 1.3, z1: 2.9, out: [4.35, 2.1], in: [6.05, 2.1] },
}
const doorCenter = (d) => [d.x, (d.z0 + d.z1) / 2]

export const SPOTS = {
  maru: { label: '마루/거실', x: -0.6, z: 1.3, yaw: Math.PI - 0.22 },
  room: { label: '내 방 아지트', x: 6.3, z: -0.5, yaw: Math.PI / 2 },
  yard: { label: '앞마당', x: -8.2, z: 4.8, yaw: Math.PI * 0.82 },
}
export const START = SPOTS.maru

/* ───────── 매 프레임 쓰는 가변 월드 상태 (리렌더 없음) ───────── */
export const world = {
  player: { x: START.x, z: START.z, y: FLOOR, rot: START.yaw, speed: 0, path: [], stuck: 0, sitY: 0 },
  look: { yaw: START.yaw, pitch: -0.15, tyaw: START.yaw },
  cam: { dist: 3.2, h: 1.8, tilt: 0 },
  keys: new Set(),
  joy: { x: 0, y: 0 }, // 가상 조이스틱
  pending: null, // { pos, act, reach }
  fx: { roof: 1, eave: 1, desk: 1 },
  doors: { main: { open: 0, manual: 0 }, room: { open: 0, manual: 0 } },
  fades: [], // 카메라 시야를 가리면 반투명해지는 벽
  playing: {}, // 소리 재생 중인 사물 id → 끝나는 시각(ms)
  // 충돌 박스 [minX, maxX, minZ, maxZ, doorId?]
  colliders: [
    // 본채 외벽
    [-4.1, 5.3, -6.1, -5.9],
    [-4.1, 5.3, 4.3, 4.5],
    [-4.08, -3.92, -6, DOORS.main.z0],
    [-4.08, -3.92, DOORS.main.z1, 4.4],
    [-4.08, -3.92, DOORS.main.z0, DOORS.main.z1, 'main'],
    [5.12, 5.28, -6, DOORS.room.z0],
    [5.12, 5.28, DOORS.room.z1, 4.4],
    [5.12, 5.28, DOORS.room.z0, DOORS.room.z1, 'room'],
    // 내 방
    [5.2, 9.1, -4.1, -3.9],
    [8.9, 9.1, -4, 3],
    [5.2, 9.1, 2.9, 3.1],
    // 거실
    [-2.5, -0.1, -6, -5.4], // TV 장
    [0.1, 1.0, -5.9, -4.85], // 장작난로
    [-3.4, -2.7, -5.95, -5.25], // 화분
    [-3.65, -1.95, -3.35, -1.85], // 소파(아빠)
    [-1.85, -0.95, -3.85, -3.1], // 낮은 테이블
    [-3.98, -3.45, -4.35, -3.75], // 스탠드 협탁
    [-3.75, -2.85, 0.2, 1.0], // 보조 의자
    [-3.85, -3.25, -1.25, -0.65], // 유칼립투스 화분
    // 부엌
    [1.55, 2.45, -6, -5.15], // 냉장고
    [2.55, 5.2, -6, -5.35], // 조리대
    [4.55, 5.2, -5.35, -2.5], // 옆 조리대
    [3.3, 4.0, -5.2, -4.5], // 엄마
    [1.95, 4.05, -0.7, 0.9], // 식탁+의자
    [1.32, 1.48, -1.58, -1.42], // 나무 기둥
    // 내 방 가구
    [5.3, 7.35, -3.95, -2.55], // 이부자리
    [7.5, 9.0, -2.75, -2.45], // 아지트 담요(뒤)
    [7.5, 9.0, 0.95, 1.25], // 아지트 담요(앞)
    // 앞마당
    [-11.7, -3.95, -9.7, -6.35], // 창고채
    ...[-5.7, -2.6, -0.2, 3.0].map((z) => [-7.18, -7.02, z - 0.08, z + 0.08]), // 처마 기둥
    [-10.9, -9.7, -6.1, -4.9], // 개집
    [-11.3, -9.95, -2.9, 0.9], // 장독대
    [-8.85, -8.35, -2.85, -2.35], // 감나무
    [-7.1, -6.1, -5.8, -4.8], // 다라이
    [-9.05, -7.45, 2.75, 4.05], // 평상
    [-11.2, -9.3, 2.4, 4.6], // 텃밭
    [-11.4, -8.7, 5.55, 6.35], // 꽃밭(왼)
    [-6.45, -4.1, 5.55, 6.35], // 꽃밭(오)
    [-7.05, -6.65, 5.75, 6.15], // 우체통
    // 돌담
    [-11.9, -11.45, -6.4, 6.9],
    [-11.9, -8.6, 6.5, 6.9],
    [-7.1, -3.9, 6.5, 6.9],
    [-4.15, -3.75, 4.4, 6.9],
  ],
}
export const BOUNDS = { x0: -11.25, x1: 8.8, z0: -6.2, z1: 6.3 }

export const inHouse = (x, z) => x > -4 && x < 5.2 && z > -6 && z < 4.4
export const inRoom = (x, z) => x >= 5.2 && x < 9 && z > -4 && z < 3
export const inBackRoom = inRoom
export const inside = (x, z) => inHouse(x, z) || inRoom(x, z)
export const nearDesk = (x, z) => inRoom(x, z) && x > 6.9 && z > -2.6 && z < 1.0
export const underEave = (x, z) => x > -7.5 && x <= -4 && z > -6.3 && z < 4.7
export function groundY(x, z) {
  if (inside(x, z)) return FLOOR
  if (x > -4.75 && x <= -4 && z > -0.3 && z < 2.7) return 0.22 // 댓돌
  return 0
}

/* ───────── 문 열림 판정 ───────── */
export function doorWanted(id) {
  const d = DOORS[id]
  const [cx, cz] = doorCenter(d)
  const p = world.player
  const near = Math.hypot(p.x - cx, p.z - cz) < 1.5
  const viaPath = p.path.some((w) => w.door === id)
  return near || viaPath || world.doors[id].manual > performance.now()
}

/* ───────── 길찾기: 앞마당 ↔ 마루(유리문) ↔ 내 방(노란문) ───────── */
const regionOf = (x, z) => (inRoom(x, z) ? 'room' : inHouse(x, z) ? 'main' : 'yard')
function waypoints(from, to) {
  const a = regionOf(from.x, from.z)
  const b = regionOf(to.x, to.z)
  const M = DOORS.main
  const R = DOORS.room
  const wp = (p, door) => ({ x: p[0], z: p[1], door })
  if (a === b) return []
  const ym = [wp(M.out, 'main'), wp(M.in, 'main')]
  const mr = [wp(R.out, 'room'), wp(R.in, 'room')]
  if (a === 'yard' && b === 'main') return ym
  if (a === 'main' && b === 'yard') return [...ym].reverse()
  if (a === 'main' && b === 'room') return mr
  if (a === 'room' && b === 'main') return [...mr].reverse()
  if (a === 'yard' && b === 'room') return [...ym, ...mr]
  return [...mr].reverse().concat([...ym].reverse())
}

export function walkTo(x, z) {
  const p = world.player
  standUp()
  p.path = [...waypoints(p, { x, z }), { x, z }]
  p.stuck = 0
}

export function teleport(spot) {
  const p = world.player
  standUp()
  p.x = spot.x
  p.z = spot.z
  p.path = []
  p.rot = spot.yaw
  world.pending = null
  world.look.tyaw = spot.yaw
  world.look.yaw = spot.yaw
  world.cam.tilt = 0
  world.snap = true
}

/* 바닥 탭 → 이동 */
export function moveTo(e) {
  if (e.delta > 10) return
  e.stopPropagation()
  world.pending = null
  walkTo(e.point.x, e.point.z)
}

/* 유리문·노란문 탭 → 반대편으로 걸어 들어가기/나가기 */
export function tapDoor(id) {
  return {
    onClick: (e) => {
      if (e.delta > 10) return
      e.stopPropagation()
      const d = DOORS[id]
      const p = world.player
      const outside = p.x < d.x // 문 서쪽(바깥/거실 쪽)
      world.doors[id].manual = performance.now() + 2500
      world.pending = null
      const t = outside ? d.in : d.out
      walkTo(t[0] + (outside ? 0.6 : -0.6), t[1])
    },
    onPointerOver: (e) => {
      e.stopPropagation()
      document.body.style.cursor = 'pointer'
      setState({ hint: id === 'main' ? '🚪 통유리 미닫이문 (마당으로 드나들기)' : '🚪 노란 격자 미닫이문 (내 방)' })
    },
    onPointerOut: () => {
      document.body.style.cursor = 'auto'
      setState({ hint: '' })
    },
  }
}

/* ───────── 사물 터치 핸들러 ─────────
   가까우면 바로 반응, 멀면 사물 앞까지 걸어가서 반응 */
export function interact(label, act, pos, reach = 2.3) {
  return {
    onClick: (e) => {
      if (e.delta > 10) return
      e.stopPropagation()
      const p = world.player
      const d = Math.hypot(p.x - pos[0], p.z - pos[2])
      if (d <= reach) {
        world.pending = null
        act(e)
      } else {
        const k = (reach * 0.7) / d
        walkTo(pos[0] + (p.x - pos[0]) * k, pos[2] + (p.z - pos[2]) * k)
        world.pending = { pos, act, reach }
        showToast('🚶 가까이 다가가는 중…', 1200)
      }
    },
    onPointerOver: (e) => {
      e.stopPropagation()
      document.body.style.cursor = 'pointer'
      setState({ hint: label })
    },
    onPointerOut: () => {
      document.body.style.cursor = 'auto'
      setState({ hint: '' })
    },
  }
}

/* ───────── 액션 바용 등록부: 대화 상대 / 상호작용 사물 ───────── */
export const actors = new Map()
export function useActor(id, kind, label, pos, act, reach = 2.3) {
  const ref = useRef(act)
  ref.current = act
  useEffect(() => {
    actors.set(id, { id, kind, label, pos, act: () => ref.current() })
    return () => actors.delete(id)
  }, [id, kind, label, pos[0], pos[1], pos[2]])
  return interact(label, () => ref.current(), pos, reach)
}
export function nearestActor(kind, maxD) {
  const p = world.player
  let best = null
  let bd = maxD
  for (const a of actors.values()) {
    if (a.kind !== kind) continue
    if (inside(p.x, p.z) !== inside(a.pos[0], a.pos[2])) continue
    if (inRoom(p.x, p.z) !== inRoom(a.pos[0], a.pos[2])) continue
    const d = Math.hypot(p.x - a.pos[0], p.z - a.pos[2])
    if (d < bd) {
      bd = d
      best = a
    }
  }
  return best
}
export function doAction(kind) {
  const a = nearestActor(kind, kind === 'talk' ? 3.4 : 2.9)
  if (!a) {
    showToast(kind === 'talk' ? '💬 가까이에 대화할 가족이나 강아지가 없어요' : '✨ 가까이에 만질 수 있는 물건이 없어요')
    return
  }
  const p = world.player
  standUp()
  p.rot = Math.atan2(a.pos[0] - p.x, a.pos[2] - p.z)
  a.act()
}

/* ───────── 앉기 ───────── */
export function toggleSit() {
  const p = world.player
  if (getState().sitting) return standUp()
  p.path = []
  world.pending = null
  // 평상 근처면 평상 위로
  const PY = [-8.25, 3.4]
  if (Math.hypot(p.x - PY[0], p.z - PY[1]) < 2.2) {
    p.x = PY[0] + 0.2
    p.z = PY[1] + 0.25
    p.sitY = 0.42
    p.rot = Math.PI * 0.5
  } else p.sitY = 0
  setState({ sitting: true })
  showToast(p.sitY ? '🪵 평상에 걸터앉아 쉬는 중…' : '🧘 마루에 앉아 잠깐 쉬어요', 1800)
}
export function standUp() {
  if (!state.sitting) return
  world.player.sitY = 0
  setState({ sitting: false })
}

/* ───────── 소리 세션 (5~7초 들렸다가 페이드 아웃) ───────── */
export function playSound(id, fn, opts) {
  const end = audio.session(fn, opts)
  if (end) world.playing[id] = end
  return end
}
export function playAmbient(id, name, ms = 6500, stateKey) {
  const end = audio.ambientFor(name, ms)
  if (!end) return
  world.playing[id] = end
  if (stateKey) {
    setState({ [stateKey]: true })
    clearTimeout(playAmbient[id])
    playAmbient[id] = setTimeout(() => setState({ [stateKey]: false }), ms)
  }
}

export function toggleView() {
  const toFirst = state.view === 'third'
  const p = world.player
  if (toFirst) {
    world.look.yaw = p.rot
    world.look.pitch = -0.15
  } else world.look.tyaw = p.rot
  setState({ view: toFirst ? 'first' : 'third' })
}

export function openLetter() {
  let n = Math.floor(Math.random() * LETTERS.length)
  if (n === state.letter) n = (n + 1) % LETTERS.length
  setState({ letter: n })
}
