import { useSyncExternalStore } from 'react'

/* ───────── 반바지 색상 프리셋 ───────── */
export const OUTFITS = [
  { name: '남색', shorts: '#34507f' },
  { name: '빨강', shorts: '#d95550' },
  { name: '민트', shorts: '#4fb39a' },
  { name: '노랑', shorts: '#e9b53f' },
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
  rainOn: false, // 기본: 맑은 오후 4시 / 토글 시 비 오는 저녁
  stewOn: false,
  kettleOn: false,
  hint: '',
  toast: '',
  letter: -1, // 열린 편지 번호 (-1 = 닫힘)
  bubbleTick: 0,
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
   +z = 마당(남쪽), 집 정면 유리 샷시 = z 0
   거실·마루  x -6 ~ 2,  z -4 ~ 0
   뒷방       x -6 ~ 2,  z -7 ~ -4   (노란 격자 미닫이문)
   부엌       x  2 ~ 6,  z -7 ~ 0
   ㄱ자 창고채 x -10.5 ~ -6, z -7 ~ 5 (철문·쪽문·헛간)
   마당       x -6 ~ 8.2, z 0 ~ 6.6 (나무 울타리 안쪽, 미니어처 정원)
   처마       z 0 ~ 3.5 (초록 철제 기둥 z 3.3)                  */
export const FLOOR = 0.45
export const DOORS = {
  main: { x0: -1.8, x1: 1.0, z: 0, axis: 'z', out: [-0.4, 1.05], in: [-0.4, -0.95] },
  room: { x0: -1.6, x1: 0.0, z: -4, axis: 'z', out: [-0.8, -3.2], in: [-0.8, -4.8] },
}
const doorCenter = (d) => [(d.x0 + d.x1) / 2, d.z]

/* ───────── 매 프레임 쓰는 가변 월드 상태 (리렌더 없음) ───────── */
export const world = {
  player: { x: -0.4, z: 2.25, y: 0, rot: Math.PI, speed: 0, path: [], stuck: 0 },
  look: { yaw: Math.PI, pitch: -0.2, tyaw: Math.PI },
  cam: { dist: 4.4, h: 2.7 },
  keys: new Set(),
  pending: null, // { pos, act, reach }
  fx: { roof: 0, eave: 1, desk: 1 },
  doors: { main: { open: 0, manual: 0 }, room: { open: 0, manual: 0 } },
  fades: [], // 카메라 시야를 가리면 반투명해지는 벽 [{ box, mats, mesh }]
  // 충돌 박스 [minX, maxX, minZ, maxZ, doorId?]
  colliders: [
    // 외벽
    [-6.1, 6.1, -7.2, -6.9],
    [5.9, 6.1, -7.1, 0.1],
    [-10.6, -5.92, -7.2, 5.2], // ㄱ자 창고채 (거실 서쪽 벽 포함)
    // 정면 (샷시/부엌벽) + 유리 미닫이문
    [-6.0, DOORS.main.x0, -0.08, 0.08],
    [DOORS.main.x1, 6.0, -0.08, 0.08],
    [DOORS.main.x0, DOORS.main.x1, -0.08, 0.08, 'main'],
    // 거실 ↔ 뒷방 칸막이 + 노란 격자문
    [-6.0, DOORS.room.x0, -4.08, -3.92],
    [DOORS.room.x1, 2.08, -4.08, -3.92],
    [DOORS.room.x0, DOORS.room.x1, -4.08, -3.92, 'room'],
    [1.92, 2.08, -7.0, -3.92], // 뒷방 ↔ 부엌
    // 거실 가구
    [-6.0, -5.35, -2.9, -1.3], // TV 장
    [-3.0, -2.05, -3.3, -0.95], // 소파
    [-4.7, -3.75, -2.45, -1.75], // 낮은 테이블
    [0.55, 1.35, -3.65, -2.85], // 난로
    // 부엌
    [2.1, 6.0, -7.0, -6.2], // 조리대
    [5.3, 6.0, -5.6, -4.4], // 냉장고
    [3.35, 4.65, -3.0, -1.8], // 밥상
    [4.2, 5.0, -6.2, -5.45], // 엄마
    // 뒷방 아지트 (책상 옆 담요)
    [-5.95, -5.6, -7.0, -5.3],
    [-2.5, -2.2, -7.0, -5.3],
    [0.0, 1.9, -7.0, -5.6], // 이불장
    // 처마 기둥
    ...[-5.8, -2.6, 0.9, 3.6, 6.2].map((x) => [x - 0.08, x + 0.08, 3.22, 3.38]),
    // ── 오밀조밀 정원 상자 (x -6 ~ 8.2, z -7 ~ 6.6) ──
    [-5.75, -4.65, 3.9, 5.0], // 개집
    [-3.75, -2.75, 3.75, 4.65], // 다라이
    [-2.55, 0.25, 5.15, 6.15], // 텃밭
    [-5.95, -2.8, 6.2, 6.9], // 꽃밭(왼쪽)
    [3.9, 7.9, 6.2, 6.9], // 꽃밭(오른쪽)
    [6.35, 6.85, 4.95, 5.45], // 감나무 줄기
    [6.5, 8.2, -5.6, -1.2], // 장독대
    [3.95, 5.65, 1.25, 2.55], // 평상
    [3.35, 3.75, 5.7, 6.1], // 우체통
    // 나무 울타리
    [-6.3, 1.7, 6.75, 7.05],
    [3.3, 8.6, 6.75, 7.05],
    [8.25, 8.55, -7.3, 7.05],
    [6.0, 8.55, -7.3, -7.0],
  ],
}

/* 움직일 수 있는 범위 */
export const BOUNDS = { x0: -5.9, x1: 8.0, z0: -6.8, z1: 6.55 }


export const inHouse = (x, z) => x > -6 && x < 6 && z > -7 && z < 0
export const inBackRoom = (x, z) => x > -6 && x < 2 && z > -7 && z < -4
export const nearDesk = (x, z) => x > -6 && x < -2 && z > -7 && z < -4.6
export function groundY(x, z) {
  if (inHouse(x, z)) return FLOOR
  if (x > -2.0 && x < 1.2 && z >= 0 && z < 0.75) return 0.22 // 댓돌
  return 0
}

/* ───────── 문 열림 판정 ───────── */
export function doorWanted(id) {
  const d = DOORS[id]
  const [cx, cz] = doorCenter(d)
  const p = world.player
  const near = Math.hypot(p.x - cx, p.z - cz) < 1.35
  const viaPath = p.path.some((w) => w.door === id)
  return near || viaPath || world.doors[id].manual > performance.now()
}

/* ───────── 길찾기: 마당 ↔ 거실(유리문) ↔ 뒷방(격자문) ───────── */
const regionOf = (x, z) => (inBackRoom(x, z) ? 'back' : inHouse(x, z) ? 'main' : 'yard')
function waypoints(from, to) {
  const a = regionOf(from.x, from.z)
  const b = regionOf(to.x, to.z)
  const M = DOORS.main
  const R = DOORS.room
  const wp = (p, door) => ({ x: p[0], z: p[1], door })
  if (a === b) return []
  if (a === 'yard' && b === 'main') return [wp(M.out, 'main'), wp(M.in, 'main')]
  if (a === 'main' && b === 'yard') return [wp(M.in, 'main'), wp(M.out, 'main')]
  if (a === 'main' && b === 'back') return [wp(R.out, 'room'), wp(R.in, 'room')]
  if (a === 'back' && b === 'main') return [wp(R.in, 'room'), wp(R.out, 'room')]
  if (a === 'yard' && b === 'back') return [wp(M.out, 'main'), wp(M.in, 'main'), wp(R.out, 'room'), wp(R.in, 'room')]
  return [wp(R.in, 'room'), wp(R.out, 'room'), wp(M.in, 'main'), wp(M.out, 'main')]
}

export function walkTo(x, z) {
  const p = world.player
  p.path = [...waypoints(p, { x, z }), { x, z }]
  p.stuck = 0
}

/* 바닥 탭 → 이동 */
export function moveTo(e) {
  if (e.delta > 10) return
  e.stopPropagation()
  world.pending = null
  walkTo(e.point.x, e.point.z)
}

/* 유리문·격자문 탭 → 반대편으로 걸어 들어가기/나가기 */
export function tapDoor(id) {
  return {
    onClick: (e) => {
      if (e.delta > 10) return
      e.stopPropagation()
      const d = DOORS[id]
      const p = world.player
      const outside = id === 'main' ? p.z > d.z : p.z > d.z
      world.doors[id].manual = performance.now() + 2500
      world.pending = null
      const t = outside ? d.in : d.out
      walkTo(t[0], t[1] + (outside ? -0.6 : 0.6))
    },
    onPointerOver: (e) => {
      e.stopPropagation()
      document.body.style.cursor = 'pointer'
      setState({ hint: id === 'main' ? '🚪 미닫이 유리문 (터치하면 드나들어요)' : '🚪 노란 격자문 (뒷방)' })
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

export function toggleView() {
  const toFirst = state.view === 'third'
  const p = world.player
  if (toFirst) {
    world.look.yaw = p.rot
    world.look.pitch = -0.2
  } else world.look.tyaw = p.rot
  setState({ view: toFirst ? 'first' : 'third' })
}

export function openLetter() {
  let n = Math.floor(Math.random() * LETTERS.length)
  if (n === state.letter) n = (n + 1) % LETTERS.length
  setState({ letter: n })
}
