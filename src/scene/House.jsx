import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world, getState, moveTo, tapDoor, inside, doorWanted, FLOOR, DOORS } from '../store'
import * as audio from '../audio/AsmrEngine'
import { bambooMat, jangpan, woodPlank, holeBrick, metalTile, slateRoof, latticeTex, tileWall, plaster, curtainTex } from './textures'
import { Box, Cyl, FadeBox, Glass, polyGeo, roundBoxGeo } from './parts'

const WALL = '#ece6da'
const DARK = '#4a3020' // 짙은 원목 기둥·서까래
const FRAME = '#c9ccce' // 은색 알루미늄 샷시
const GREEN = '#2f7d55'
const TOP = 3.1

/* 반투명 전환 (불투명일 땐 그림자도 드리우도록 transparent 토글) */
export function setFade(m, a) {
  const t = a < 0.99
  if (m.transparent !== t) {
    m.transparent = t
    m.needsUpdate = true
  }
  m.opacity = a
  m.depthWrite = !t
}

/* ───────── 바닥: 대나무 돗자리 마루 · 원목 부엌 · 장판 방 ───────── */
function Floors() {
  const mat = useMemo(() => bambooMat([5, 9]), [])
  const wood = useMemo(() => woodPlank('#a8774c', [3, 8], 'kfloor'), [])
  const jp = useMemo(() => jangpan(), [])
  const brick = useMemo(() => holeBrick(), [])
  const slab = (x0, x1, z0, z1, map, rough = 0.75) => (
    <mesh position={[(x0 + x1) / 2, FLOOR / 2, (z0 + z1) / 2]} onClick={moveTo} geometry={roundBoxGeo(x1 - x0, FLOOR, z1 - z0, 0.02)}>
      <meshStandardMaterial map={map} roughness={rough} />
    </mesh>
  )
  return (
    <group>
      {slab(-4, 1.4, -6, 4.4, mat, 0.6)}
      {slab(1.4, 5.2, -6, 4.4, wood, 0.5)}
      {slab(5.2, 9, -4, 3, jp, 0.6)}
      {/* 마루 끝 붉은 구멍벽돌 기초 */}
      <mesh position={[-4.02, FLOOR / 2 - 0.01, -0.8]} rotation-y={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[10.4, FLOOR - 0.04]} />
        <meshStandardMaterial map={brick} roughness={1} />
      </mesh>
      <Box p={[-4.02, FLOOR - 0.015, -0.8]} s={[0.1, 0.04, 10.4]} c="#8a5a34" raycast={() => null} />
      {/* 댓돌 */}
      <mesh position={[-4.38, 0.11, 1.2]} onClick={moveTo} geometry={roundBoxGeo(0.72, 0.22, 3.0, 0.05)}>
        <meshStandardMaterial color="#a8a399" roughness={0.9} />
      </mesh>
      {/* 처마 밑 시멘트 바닥 */}
      <mesh position={[-5.75, 0.025, -0.8]} onClick={moveTo} geometry={roundBoxGeo(3.5, 0.05, 10.9, 0.02)}>
        <meshStandardMaterial color="#c9c4ba" roughness={0.55} />
      </mesh>
      {/* 신발 한 켤레 */}
      <Box p={[-4.6, 0.27, 2.0]} s={[0.28, 0.08, 0.12]} c="#2e2a28" />
      <Box p={[-4.62, 0.27, 2.2]} s={[0.28, 0.08, 0.12]} c="#2e2a28" />
    </group>
  )
}

/* ───────── 은색 통유리 샷시 (z 방향으로 놓임) ───────── */
function SashZ({ z0, z1, x = -4, y0 = FLOOR, y1 = 2.55, mid = false }) {
  const w = z1 - z0
  const h = y1 - y0
  return (
    <group position={[x, 0, (z0 + z1) / 2]} rotation-y={Math.PI / 2}>
      <Box p={[0, y0 + 0.04, 0]} s={[w, 0.08, 0.12]} c={FRAME} r={0.35} m={0.5} />
      <Box p={[0, y1 - 0.04, 0]} s={[w, 0.08, 0.12]} c={FRAME} r={0.35} m={0.5} />
      <Box p={[-w / 2 + 0.04, y0 + h / 2, 0]} s={[0.08, h, 0.12]} c={FRAME} r={0.35} m={0.5} />
      <Box p={[w / 2 - 0.04, y0 + h / 2, 0]} s={[0.08, h, 0.12]} c={FRAME} r={0.35} m={0.5} />
      {mid && <Box p={[0, y0 + h / 2, 0]} s={[0.06, h, 0.1]} c={FRAME} r={0.35} m={0.5} />}
      <Glass p={[0, y0 + h / 2, 0]} s={[w, h]} opacity={0.1} />
    </group>
  )
}

/* 미닫이 문짝 — z 방향으로 미끄러짐 */
function SlideZ({ id, z, travel, x, children }) {
  const g = useRef()
  useFrame(() => {
    g.current.position.z = z + travel * world.doors[id].open
  })
  return (
    <group ref={g} position={[x, 0, z]}>
      <group rotation-y={Math.PI / 2}>{children}</group>
    </group>
  )
}

function GlassDoor() {
  const d = DOORS.main
  const pw = (d.z1 - d.z0) / 2 + 0.04
  const y0 = FLOOR
  const y1 = 2.55
  const h = y1 - y0
  const panel = (handle) => (
    <>
      <Box p={[0, y0 + 0.05, 0]} s={[pw, 0.1, 0.07]} c={FRAME} r={0.35} m={0.5} />
      <Box p={[0, y1 - 0.05, 0]} s={[pw, 0.1, 0.07]} c={FRAME} r={0.35} m={0.5} />
      <Box p={[-pw / 2 + 0.05, y0 + h / 2, 0]} s={[0.1, h, 0.07]} c={FRAME} r={0.35} m={0.5} />
      <Box p={[pw / 2 - 0.05, y0 + h / 2, 0]} s={[0.1, h, 0.07]} c={FRAME} r={0.35} m={0.5} />
      <Box p={[handle * (pw / 2 - 0.05), y0 + 1.0, 0.06]} s={[0.04, 0.4, 0.05]} c="#e2e2e0" m={0.4} />
      <Glass p={[0, y0 + h / 2, 0]} s={[pw - 0.12, h - 0.15]} opacity={0.08} />
      <mesh position={[0, y0 + h / 2, 0]} {...tapDoor('main')}>
        <boxGeometry args={[pw, h, 0.14]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  )
  // rotation-y=+π/2 이면 로컬 +x → 월드 -z
  return (
    <group>
      <SlideZ id="main" x={d.x + 0.035} z={d.z0 + pw / 2 - 0.02} travel={-(pw - 0.12)}>
        {panel(-1)}
      </SlideZ>
      <SlideZ id="main" x={d.x - 0.035} z={d.z1 - pw / 2 + 0.02} travel={pw - 0.12}>
        {panel(1)}
      </SlideZ>
    </group>
  )
}

/* 노란 격자 미닫이문 (내 방) */
function YellowDoor() {
  const d = DOORS.room
  const tex = useMemo(() => latticeTex(), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }), [tex])
  const pw = (d.z1 - d.z0) / 2 + 0.03
  const y0 = FLOOR
  const h = 2.15
  const panel = (
    <mesh position={[0, y0 + h / 2, 0]} material={mat} geometry={roundBoxGeo(pw, h, 0.05, 0.015)} {...tapDoor('room')} />
  )
  const cz = (d.z0 + d.z1) / 2
  return (
    <group>
      <Box p={[d.x, y0 + h + 0.04, cz]} s={[0.2, 0.08, d.z1 - d.z0 + 0.16]} c="#e2ad18" r={0.5} />
      <Box p={[d.x, y0 + h / 2, d.z0 - 0.04]} s={[0.2, h, 0.08]} c="#e2ad18" r={0.5} />
      <Box p={[d.x, y0 + h / 2, d.z1 + 0.04]} s={[0.2, h, 0.08]} c="#e2ad18" r={0.5} />
      <SlideZ id="room" x={d.x - 0.035} z={d.z0 + pw / 2} travel={-(pw - 0.05)}>
        {panel}
      </SlideZ>
      <SlideZ id="room" x={d.x + 0.035} z={d.z1 - pw / 2} travel={pw - 0.05}>
        {panel}
      </SlideZ>
    </group>
  )
}

/* 거실 뒤 창문 + 얇은 커튼 (창밖 초록 풍경) */
function BackWindow() {
  const cur = useMemo(() => curtainTex(), [])
  const view = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 96
    const g = c.getContext('2d')
    const gr = g.createLinearGradient(0, 0, 0, 96)
    gr.addColorStop(0, '#cfe3ee')
    gr.addColorStop(0.45, '#9fc27e')
    gr.addColorStop(1, '#5f8a3e')
    g.fillStyle = gr
    g.fillRect(0, 0, 128, 96)
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(${60 + Math.random() * 40},${110 + Math.random() * 50},${40},.6)`
      g.beginPath()
      g.arc(Math.random() * 128, 30 + Math.random() * 40, 6 + Math.random() * 10, 0, Math.PI * 2)
      g.fill()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const X = -1.3
  return (
    <group position={[X, 2.15, -5.9]}>
      <mesh position={[0, 0, 0.0]}>
        <planeGeometry args={[1.7, 1.0]} />
        <meshBasicMaterial map={view} toneMapped={false} color="#e8f0e0" />
      </mesh>
      {/* 격자 창틀 */}
      <Box p={[0, 0.52, 0.04]} s={[1.84, 0.08, 0.08]} c={DARK} />
      <Box p={[0, -0.52, 0.04]} s={[1.84, 0.08, 0.1]} c={DARK} />
      {[-0.88, -0.29, 0.29, 0.88].map((x) => (
        <Box key={x} p={[x, 0, 0.04]} s={[0.06, 1.05, 0.06]} c={DARK} />
      ))}
      <Box p={[0, 0.05, 0.04]} s={[1.8, 0.04, 0.04]} c={DARK} />
      {/* 커튼 */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.82, -0.05, 0.12]} raycast={() => null}>
          <planeGeometry args={[0.55, 1.3, 6, 1]} />
          <meshStandardMaterial map={cur} transparent opacity={0.95} side={THREE.DoubleSide} roughness={1} />
        </mesh>
      ))}
      <Cyl p={[0, 0.66, 0.12]} r={0.015} h={2.3} rot={[0, 0, Math.PI / 2]} c="#b08a5a" />
    </group>
  )
}

/* ───────── 벽 (카메라를 가리면 반투명) ───────── */
function Walls() {
  const md = DOORS.main
  const rd = DOORS.room
  const tiles = useMemo(() => tileWall(), [])
  const pl = useMemo(() => plaster(), [])
  return (
    <group>
      {/* 본채 */}
      <FadeBox x0={-4} x1={5.2} z0={-6.08} z1={-5.92} y0={0} y1={TOP} c={WALL} map={pl} />
      <FadeBox x0={-4} x1={5.2} z0={4.32} z1={4.48} y0={0} y1={TOP} c={WALL} map={pl} />
      <FadeBox x0={-4.06} x1={-3.94} z0={-6} z1={4.4} y0={2.55} y1={TOP} c={WALL} map={pl} />
      <FadeBox x0={5.12} x1={5.28} z0={-6} z1={rd.z0 - 0.08} y0={0} y1={TOP} c={WALL} map={pl} />
      <FadeBox x0={5.12} x1={5.28} z0={rd.z1 + 0.08} z1={4.4} y0={0} y1={TOP} c={WALL} map={pl} />
      <FadeBox x0={5.12} x1={5.28} z0={rd.z0 - 0.08} z1={rd.z1 + 0.08} y0={FLOOR + 2.23} y1={TOP} c={WALL} map={pl} />
      {/* 부엌 타일 벽 */}
      <mesh position={[3.3, 1.55, -5.91]} raycast={() => null}>
        <planeGeometry args={[3.8, 2.2]} />
        <meshStandardMaterial map={tiles} roughness={0.4} />
      </mesh>
      {/* 서쪽 통유리 샷시 (+ 미닫이문) */}
      <WestGlass>
        <SashZ z0={-6} z1={-3.1} mid />
        <SashZ z0={-3.1} z1={md.z0} mid />
        <SashZ z0={md.z1} z1={4.4} />
        <GlassDoor />
      </WestGlass>
      {/* 짙은 원목 기둥 */}
      {[-6, -3.1, md.z0, md.z1, 4.4].map((z) => (
        <Box key={z} p={[-4, 1.78, z]} s={[0.18, 2.66, 0.18]} c={DARK} r={0.7} />
      ))}
      {[
        [1.4, -1.5],
        [1.4, -5.9],
        [5.2, -5.9],
        [5.2, 4.3],
        [1.4, 4.3],
      ].map(([x, z]) => (
        <Box key={x + '_' + z} p={[x, 1.78, z]} s={[0.2, 2.66, 0.2]} c={DARK} r={0.7} />
      ))}
      <YellowDoor />
      <BackWindow />
      {/* 내 방 */}
      <FadeBox x0={5.2} x1={9} z0={-4.08} z1={-3.92} y0={0} y1={2.9} c={WALL} map={pl} />
      <FadeBox x0={8.92} x1={9.08} z0={-4} z1={3} y0={0} y1={2.9} c={WALL} map={pl} />
      <FadeBox x0={5.2} x1={9} z0={2.92} z1={3.08} y0={0} y1={2.9} c={WALL} map={pl} />
    </group>
  )
}

/* 카메라가 서쪽 바깥 + 플레이어가 안쪽이면 유리 샷시를 흐릿하게 */
function WestGlass({ children }) {
  const g = useRef()
  const a = useRef(1)
  useFrame(({ camera }, dt) => {
    const p = world.player
    const want = getState().view === 'third' && inside(p.x, p.z) && camera.position.x < -3.95 ? 0.12 : 1
    a.current += (want - a.current) * Math.min(1, dt * 6)
    const v = a.current
    g.current.traverse((o) => {
      if (!o.isMesh) return
      const m = o.material
      if (m.userData.base === undefined) m.userData.base = m.opacity
      if (m.userData.base < 0.99) m.opacity = m.userData.base * v
      else setFade(m, v)
    })
  })
  return <group ref={g}>{children}</group>
}

/* ───────── ㄱ자 창고채 (마당 북쪽) ───────── */
function Wing() {
  const Z = -6.37
  const pl = useMemo(() => plaster(), [])
  return (
    <group>
      <FadeBox x0={-11.6} x1={-4} z0={-9.6} z1={-6.4} y0={0} y1={2.9} c="#e9dfc6" map={pl} />
      <Box p={[-7.8, 0.13, Z]} s={[7.6, 0.26, 0.06]} c="#8f8f8b" raycast={() => null} />
      {/* 쪽문 */}
      <group position={[-10.4, 0, Z]}>
        <Box p={[0, 1.05, 0]} s={[0.95, 2.1, 0.05]} c="#8a7b66" r={0.7} />
        <Box p={[0, 1.45, 0.03]} s={[0.66, 0.85, 0.02]} c="#2c3438" r={0.2} m={0.2} />
      </group>
      {/* 회색 철문 */}
      <group position={[-8.6, 0, Z]}>
        <Box p={[0, 1.1, 0]} s={[1.5, 2.2, 0.06]} c="#9fa3a4" r={0.45} m={0.35} />
        <Box p={[-0.37, 1.95, 0.035]} s={[0.6, 0.38, 0.02]} c="#2a2e31" r={0.3} />
        <Box p={[0.37, 1.95, 0.035]} s={[0.6, 0.38, 0.02]} c="#2a2e31" r={0.3} />
        <Box p={[0, 1.1, 0.04]} s={[0.025, 2.2, 0.02]} c="#6c7072" />
        <Box p={[0, 1.15, 0.06]} s={[0.5, 0.05, 0.03]} c="#6a3e22" m={0.3} />
      </group>
      {/* 헛간 */}
      <group position={[-6.3, 0, Z]}>
        <Box p={[0, 1.2, 0]} s={[1.8, 2.3, 0.04]} c="#3d3a36" r={1} />
        <Box p={[-0.35, 0.42, 0.35]} s={[0.7, 0.25, 0.5]} c="#2f8a7c" r={0.6} />
        <Cyl p={[-0.35, 0.15, 0.35]} r={0.1} h={0.06} c="#222" rot={[Math.PI / 2, 0, 0]} />
        <Box p={[0.5, 0.3, 0.3]} s={[0.4, 0.6, 0.3]} c="#d9c46a" r={1} />
      </group>
      <Cyl p={[-7.3, 1.45, Z + 0.1]} r={0.055} h={2.9} c="#9a5a34" />
    </group>
  )
}

/* ───────── 지붕 + 원목 천장(서까래·들보) ───────── */
const _up = new THREE.Vector3(0, 1, 0)
function Beam({ a, b, mat, r = 0.06, round }) {
  const { pos, quat, len } = useMemo(() => {
    const A = new THREE.Vector3(...a)
    const B = new THREE.Vector3(...b)
    const d = B.clone().sub(A)
    const len = d.length()
    return { pos: A.clone().add(B).multiplyScalar(0.5), quat: new THREE.Quaternion().setFromUnitVectors(_up, d.normalize()), len }
  }, [a, b])
  return (
    <mesh position={pos} quaternion={quat} material={mat} raycast={() => null}>
      {round ? <capsuleGeometry args={[r, len, 4, 10]} /> : <primitive object={roundBoxGeo(r * 2, len, r * 2.4, r * 0.4)} attach="geometry" />}
    </mesh>
  )
}

function Roofs({ mats }) {
  const g = useMemo(() => {
    const y0 = 3.15
    const y1 = 4.85
    const [X0, X1, Z0, Z1, RX] = [-4.35, 5.55, -6.35, 4.75, 0.6]
    const R1 = [RX, y1, -1.4]
    const R2 = [RX, y1, -0.2]
    const A = [X0, y0, Z1]
    const B = [X1, y0, Z1]
    const C = [X1, y0, Z0]
    const D = [X0, y0, Z0]
    const faces = [[D, A, R2, R1], [B, C, R1, R2], [A, B, R2], [C, D, R1]]
    const uv = (p, fi) => (fi < 2 ? [p[2] * 0.5, p[1] * 1.4 + p[0] * 0.2] : [p[0] * 0.5, p[1] * 1.4 + p[2] * 0.2])
    const hip = polyGeo(faces, uv)
    const lower = (pt) => [pt[0], pt[1] - 0.06, pt[2]]
    const ceil = polyGeo(faces.map((f) => f.map(lower)), (p, fi) => (fi < 2 ? [p[2] * 0.6, p[0] * 0.6] : [p[0] * 0.6, p[2] * 0.6]))
    // 서까래: 처마에서 용마루/내림마루까지
    const rafters = []
    const topAt = (z) => {
      let t = 1
      if (z < R1[2]) t = (z - Z0) / (R1[2] - Z0)
      else if (z > R2[2]) t = (Z1 - z) / (Z1 - R2[2])
      return Math.max(0.05, Math.min(1, t))
    }
    for (let z = -5.9; z <= 4.3; z += 0.72) {
      const t = topAt(z)
      const yT = y0 + t * (y1 - y0) - 0.14
      rafters.push([[X0 + 0.35, y0 + ((0.35) / (RX - X0)) * (y1 - y0) - 0.14, z], [X0 + t * (RX - X0), yT, z]])
      rafters.push([[X1 - 0.35, y0 + ((0.35) / (X1 - RX)) * (y1 - y0) - 0.14, z], [X1 - t * (X1 - RX), yT, z]])
    }
    // 창고채 박공
    const wing = polyGeo(
      [
        [[-12, 2.95, -6.0], [-3.9, 2.95, -6.0], [-3.9, 3.8, -8.0], [-12, 3.8, -8.0]],
        [[-3.9, 2.95, -10.0], [-12, 2.95, -10.0], [-12, 3.8, -8.0], [-3.9, 3.8, -8.0]],
      ],
      (p) => [p[0] * 0.55, p[2] * 0.8]
    )
    // 내 방 외쪽 지붕
    const room = polyGeo([[[5.0, 3.1, -4.35], [5.0, 3.1, 3.35], [9.4, 2.75, 3.35], [9.4, 2.75, -4.35]]], (p) => [p[2] * 0.55, p[0] * 0.8])
    const roomCeil = polyGeo([[[5.0, 3.04, -4.35], [5.0, 3.04, 3.35], [9.4, 2.69, 3.35], [9.4, 2.69, -4.35]]], (p) => [p[2] * 0.6, p[0] * 0.6])
    // 서쪽 처마 (초록 철제 + 골함석)
    const eave = polyGeo([[[-4.05, 2.98, -6.3], [-4.05, 2.98, 4.7], [-7.55, 2.58, 4.7], [-7.55, 2.58, -6.3]]], (p) => [p[2] * 0.55, p[0] * 0.8])
    return { hip, ceil, rafters, wing, room, roomCeil, eave, R1, R2, A, B, C, D }
  }, [])
  const eaveRef = useRef()
  useFrame(() => {
    eaveRef.current.visible = world.fx.eave > 0.02
  })
  const { R1, R2, A, B, C, D } = g
  return (
    <>
      <group>
        <mesh geometry={g.hip} material={mats.tile} />
        <mesh geometry={g.ceil} material={mats.ceil} />
        {[
          [R1, R2],
          [R1, C],
          [R1, D],
          [R2, A],
          [R2, B],
        ].map(([a, b], i) => (
          <Beam key={i} a={[a[0], a[1] + 0.05, a[2]]} b={[b[0], b[1] + 0.05, b[2]]} mat={mats.ridge} r={0.09} round />
        ))}
        {/* 서까래 */}
        {g.rafters.map(([a, b], i) => (
          <Beam key={'r' + i} a={a} b={b} mat={mats.beam} r={0.055} />
        ))}
        {/* 들보 (가로) + 대들보 */}
        {[-3.6, 0.6].map((z) => (
          <mesh key={z} position={[0.6, 3.08, z]} material={mats.beam} geometry={roundBoxGeo(9.2, 0.26, 0.24, 0.04)} raycast={() => null} />
        ))}
        <mesh position={[1.4, 3.02, -0.8]} material={mats.beam} geometry={roundBoxGeo(0.24, 0.24, 10.3, 0.04)} raycast={() => null} />
        {/* 둥근 처마 테두리 */}
        <Beam a={A} b={B} mat={mats.ridge} r={0.08} round />
        <Beam a={B} b={C} mat={mats.ridge} r={0.08} round />
        <Beam a={C} b={D} mat={mats.ridge} r={0.08} round />
        <Beam a={D} b={A} mat={mats.ridge} r={0.08} round />
        <mesh geometry={g.wing} material={mats.corr} />
        <mesh geometry={g.room} material={mats.tile} />
        <mesh geometry={g.roomCeil} material={mats.ceil} />
      </group>
      <group ref={eaveRef}>
        <mesh geometry={g.eave} material={mats.eaveTop} userData={{ noCast: true }} />
        <mesh geometry={g.eave} material={mats.eaveUnder} position={[0, -0.04, 0]} userData={{ noCast: true }} />
        <mesh position={[-7.58, 2.52, -0.8]} material={mats.wood} geometry={roundBoxGeo(0.12, 0.2, 11.1, 0.03)} userData={{ noCast: true }} />
        <mesh position={[-7.68, 2.6, -0.8]} rotation-x={Math.PI / 2} material={mats.gutter} userData={{ noCast: true }}>
          <cylinderGeometry args={[0.07, 0.07, 11.1, 10, 1, true, 0, Math.PI]} />
        </mesh>
        <mesh position={[-7.1, 2.55, -0.8]} material={mats.green} geometry={roundBoxGeo(0.08, 0.08, 11, 0.03)} userData={{ noCast: true }} />
        {[-5.7, -2.6, -0.2, 3.0].map((z) => (
          <Beam key={z} a={[-4.1, 2.93, z]} b={[-7.1, 2.57, z]} mat={mats.green} r={0.03} />
        ))}
      </group>
    </>
  )
}

/* ───────── 메인 ───────── */
export default function House() {
  const mats = useMemo(() => {
    const t = (o) => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...o })
    return {
      tile: t({ map: metalTile(), roughness: 0.55, metalness: 0.25 }),
      corr: t({ map: slateRoof(), roughness: 0.6, metalness: 0.2 }),
      ceil: t({ map: woodPlank('#5a3c27', [1, 1], 'ceil'), roughness: 0.8 }),
      ridge: t({ color: '#3e2620', roughness: 0.6 }),
      wood: t({ color: '#6b4429', roughness: 0.7 }),
      beam: t({ color: DARK, roughness: 0.75 }),
      eaveTop: t({ color: '#8a8580', map: slateRoof(), roughness: 0.5, metalness: 0.3 }),
      eaveUnder: t({ color: '#c9c7c2', roughness: 0.6, metalness: 0.2 }),
      gutter: t({ color: '#a8673a', roughness: 0.5 }),
      green: t({ color: GREEN, roughness: 0.45, metalness: 0.3 }),
    }
  }, [])

  const tmpA = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const p = world.player
    const third = getState().view === 'third'
    const c = camera.position
    // 처마: 카메라가 처마 위로 올라가 있으면 숨김
    const eaveY = 2.98 - ((-4.05 - c.x) / 3.5) * 0.4
    const block = third && c.x < -4 && c.x > -7.7 && c.z > -6.4 && c.z < 4.8 && c.y > eaveY - 0.15
    world.fx.eave += ((block ? 0 : 1) - world.fx.eave) * Math.min(1, dt * 8)
    for (const k of ['eaveTop', 'eaveUnder', 'gutter', 'green', 'wood']) setFade(mats[k], world.fx.eave)

    // 문 열고 닫기
    for (const id of Object.keys(world.doors)) {
      const d = world.doors[id]
      const want = doorWanted(id)
      if (want !== d.want) {
        d.want = want
        if (getState().started) audio.doorSlide()
      }
      d.open += ((want ? 1 : 0) - d.open) * Math.min(1, dt * 3.2)
    }

    // 시야를 가리는 벽은 반투명
    tmpA.set(p.x, p.y + 0.8, p.z)
    for (const f of world.fades) {
      const blk = third && segBox(c, tmpA, f.box)
      f.a += ((blk ? 0.1 : 1) - f.a) * Math.min(1, dt * 8)
      setFade(f.mat, f.a)
      if (f.tag) world.fx[f.tag] = f.a
    }
  })

  return (
    <group>
      <Floors />
      <Walls />
      <Wing />
      <Roofs mats={mats} />
    </group>
  )
}

/* 선분(카메라→플레이어)이 박스를 지나는지 (xz 평면 + 높이 체크) */
function segBox(a, b, [x0, x1, z0, z1, top]) {
  const pad = 0.15
  let t0 = 0
  let t1 = 1
  const dx = b.x - a.x
  const dz = b.z - a.z
  for (const [p, d, lo, hi] of [
    [a.x, dx, x0 - pad, x1 + pad],
    [a.z, dz, z0 - pad, z1 + pad],
  ]) {
    if (Math.abs(d) < 1e-6) {
      if (p < lo || p > hi) return false
    } else {
      let ta = (lo - p) / d
      let tb = (hi - p) / d
      if (ta > tb) [ta, tb] = [tb, ta]
      t0 = Math.max(t0, ta)
      t1 = Math.min(t1, tb)
      if (t0 > t1) return false
    }
  }
  const yA = a.y + (b.y - a.y) * t0
  const yB = a.y + (b.y - a.y) * t1
  return Math.min(yA, yB) < top
}
