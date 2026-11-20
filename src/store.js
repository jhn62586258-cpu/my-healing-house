import { useSyncExternalStore } from 'react'

/* ───────── 의상 프리셋 ───────── */
export const OUTFITS = [
  { name: '딸기우유', pants: '#f8bccb', line: '#ffffff', line2: '#ea8fa8', sock: '#fff1f4' },
  { name: '민트소다', pants: '#a8e6cf', line: '#ffffff', line2: '#6cc4a1', sock: '#fff6bd' },
  { name: '라벤더', pants: '#cbbdf3', line: '#ffffff', line2: '#9a85e2', sock: '#ffd5e8' },
]

/* ───────── 아주 작은 전역 스토어 (리액트 상태) ───────── */
let state = {
  started: false,
  view: 'third', // 'third' | 'first'
  outfit: 0,
  uiHidden: false,
  zone: 'room',
  rainLevel: 1, // 1 가랑비, 2 장대비
  mixer: {
    rain: { on: true, vol: 0.7 },
    stew: { on: false, vol: 0.6 },
    leaves: { on: false, vol: 0.5 },
  },
  hint: '',
  toast: '',
  bubbleTick: 0,
  timer: { running: false, left: 1500 },
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
export function showToast(msg) {
  setState({ toast: msg })
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => setState({ toast: '' }), 2600)
}

/* ───────── 매 프레임 쓰는 가변 월드 상태 (리렌더 없음) ───────── */
export const world = {
  player: { x: -8.0, z: -3.55, y: 0.15, rot: Math.PI, speed: 0, target: null },
  look: { yaw: Math.PI, pitch: -0.38, tyaw: Math.PI - 0.5 },
  cam: { dist: 5, h: 4 },
  keys: new Set(),
  dragLock: false,
  fx: { roof: 0.1, desk: 1 },
  // [minX, maxX, minZ, maxZ]
  colliders: [
    [-10.2, 6.2, -6.2, -5.9], // 뒷벽
    [-10.2, -10.0, -6.2, 0], // 왼벽
    [6.0, 6.2, -6.2, 0], // 오른벽
    [-4.1, -3.9, -6.0, -2.4], // 방/거실 칸막이
    [-9.9, -9.7, -5.4, -3.8], // 책상 왼쪽 담요
    [-6.3, -6.1, -5.4, -3.8], // 책상 오른쪽 담요
    [2.8, 5.8, -5.9, -4.75], // 부엌 조리대
    [-6.35, -5.65, 5.65, 6.35], // 감나무 줄기
  ],
}

export const groundY = (x, z) => (x > -10 && x < 6 && z > -6 && z < 1.9 ? 0.15 : 0)
export const inDesk = (x, z) => x > -9.8 && x < -6.2 && z > -5.4 && z < -3.8
export const nearDesk = (x, z) => x > -10 && x < -6 && z > -5.5 && z < -2.9
export const zoneAt = (x, z) => (z > 0.2 ? 'yard' : x < -4 ? 'room' : 'living')

export const ZONES = {
  room: { x: -8.0, z: -3.55, rot: Math.PI },
  living: { x: 0.4, z: -1.2, rot: Math.PI },
  yard: { x: 1.2, z: 1.2, rot: 0 },
}

export function teleport(zone) {
  const z = ZONES[zone]
  const p = world.player
  p.x = z.x
  p.z = z.z
  p.rot = z.rot
  p.target = null
  world.look.yaw = z.rot
  world.look.tyaw = z.rot - 0.5
  setState({ zone })
}

export function toggleView() {
  const toFirst = state.view === 'third'
  const p = world.player
  if (toFirst) {
    world.look.yaw = p.rot
    world.look.pitch = -0.38
  } else {
    world.look.tyaw = p.rot - 0.45
  }
  setState({ view: toFirst ? 'first' : 'third' })
}

/* 바닥 클릭 이동 */
export function moveTo(e) {
  if (e.delta > 5) return
  e.stopPropagation()
  world.player.target = { x: e.point.x, z: e.point.z }
}

/* 3D 오브젝트 상호작용 핸들러 묶음 */
export function interact(label, onAct) {
  return {
    onPointerDown: (e) => {
      e.stopPropagation()
      world.dragLock = true
      if (onAct) onAct(e)
    },
    onClick: (e) => e.stopPropagation(),
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

export function toggleMixer(key) {
  setState((s) => ({ mixer: { ...s.mixer, [key]: { ...s.mixer[key], on: !s.mixer[key].on } } }))
}
export function toggleRain() {
  const next = state.rainLevel === 1 ? 2 : 1
  setState({ rainLevel: next })
  showToast(next === 2 ? '🌧️ 장대비가 쏟아져요' : '☔ 가랑비로 잦아들어요')
}
export function refillBubbles() {
  setState((s) => ({ bubbleTick: s.bubbleTick + 1 }))
  showToast('🫧 새 뽁뽁이로 리필했어요!')
}
