import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world, getState, moveTo, tapDoor, inHouse, doorWanted, FLOOR, DOORS } from '../store'
import * as audio from '../audio/AsmrEngine'
import { bambooMat, jangpan, kitchenTile, holeBrick, metalTile, slateRoof, bokTex, latticeTex } from './textures'
import { Box, Cyl, Sph, FadeBox, Glass, Rod, polyGeo, roundBoxGeo } from './parts'

const CREAM = '#f8eedb'
const WHITE_FRAME = '#f4f4f0'
const GREEN = '#8cc0a0'
const WOOD = '#c09068'
const GUTTER = '#cf9c7c'
const TOP = 3.1 // 벽 높이

/* ───────── 바닥: 돗자리 마루 · 뒷방 장판 · 부엌 타일 + 붉은 구멍벽돌 기초 ───────── */
function Floors() {
  const bamboo = useMemo(() => bambooMat([5, 3]), [])
  const jp = useMemo(() => jangpan(), [])
  const kt = useMemo(() => kitchenTile(), [])
  const brick = useMemo(() => holeBrick(), [])
  const slab = (x0, x1, z0, z1, map) => (
    <mesh position={[(x0 + x1) / 2, FLOOR / 2, (z0 + z1) / 2]} onClick={moveTo} geometry={roundBoxGeo(x1 - x0, FLOOR, z1 - z0, 0.05)}>
      <meshStandardMaterial map={map} roughness={0.8} />
    </mesh>
  )
  return (
    <group>
      {slab(-6, 2, -4, 0, bamboo)}
      {slab(-6, 2, -7, -4, jp)}
      {slab(2, 6, -7, 0, kt)}
      {/* 정면 구멍벽돌 기초 + 마루 끝 나무 턱 */}
      <mesh position={[0, FLOOR / 2 - 0.02, 0.035]} raycast={() => null}>
        <boxGeometry args={[12, FLOOR - 0.04, 0.04]} />
        <meshStandardMaterial map={brick} roughness={1} />
      </mesh>
      <Box p={[-2, FLOOR - 0.015, 0.02]} s={[8, 0.03, 0.08]} c="#c98a4a" raycast={() => null} />
      {/* 댓돌 */}
      <mesh position={[-0.4, 0.11, 0.38]} onClick={moveTo} geometry={roundBoxGeo(3.0, 0.22, 0.72, 0.09)}>
        <meshStandardMaterial color="#e2d3bb" roughness={1} />
      </mesh>
      {/* 처마 밑 시멘트 바닥 */}
      <mesh position={[0.15, 0.03, 1.85]} onClick={moveTo} geometry={roundBoxGeo(12.3, 0.08, 3.7, 0.04)}>
        <meshStandardMaterial color="#eadcc4" roughness={1} />
      </mesh>
      {/* 신발 한 켤레 */}
      <Box p={[1.5, 0.1, 0.5]} s={[0.13, 0.08, 0.28]} c="#7d6a8a" />
      <Box p={[1.68, 0.1, 0.52]} s={[0.13, 0.08, 0.28]} c="#7d6a8a" />
    </group>
  )
}

/* ───────── 흰색 통유리 샷시 ───────── */
function SashFrame({ x0, x1, y0 = FLOOR, y1 = 2.55, z = 0, mid = false }) {
  const w = x1 - x0
  const cx = (x0 + x1) / 2
  const h = y1 - y0
  return (
    <group>
      <Box p={[cx, y0 + 0.04, z]} s={[w, 0.08, 0.12]} c={WHITE_FRAME} r={0.4} />
      <Box p={[cx, y1 - 0.04, z]} s={[w, 0.08, 0.12]} c={WHITE_FRAME} r={0.4} />
      <Box p={[x0 + 0.04, y0 + h / 2, z]} s={[0.08, h, 0.12]} c={WHITE_FRAME} r={0.4} />
      <Box p={[x1 - 0.04, y0 + h / 2, z]} s={[0.08, h, 0.12]} c={WHITE_FRAME} r={0.4} />
      {mid && <Box p={[cx, y0 + h / 2, z]} s={[0.07, h, 0.1]} c={WHITE_FRAME} r={0.4} />}
      <Glass p={[cx, y0 + h / 2, z]} s={[w, h]} />
    </group>
  )
}

/* 미닫이 문짝 (슬라이딩) */
function SlidePanel({ id, x, w, travel, z, y0, y1, children, ...rest }) {
  const g = useRef()
  useFrame(() => {
    g.current.position.x = x + travel * world.doors[id].open
  })
  return (
    <group ref={g} position={[x, 0, z]} {...rest}>
      {children}
    </group>
  )
}

function GlassDoor() {
  const d = DOORS.main
  const pw = (d.x1 - d.x0) / 2 + 0.04
  const y0 = FLOOR
  const y1 = 2.55
  const h = y1 - y0
  const panel = (handleSide) => (
    <>
      <Box p={[0, y0 + 0.05, 0]} s={[pw, 0.1, 0.07]} c={WHITE_FRAME} r={0.4} />
      <Box p={[0, y1 - 0.05, 0]} s={[pw, 0.1, 0.07]} c={WHITE_FRAME} r={0.4} />
      <Box p={[-pw / 2 + 0.05, y0 + h / 2, 0]} s={[0.1, h, 0.07]} c={WHITE_FRAME} r={0.4} />
      <Box p={[pw / 2 - 0.05, y0 + h / 2, 0]} s={[0.1, h, 0.07]} c={WHITE_FRAME} r={0.4} />
      <Box p={[handleSide * (pw / 2 - 0.05), y0 + 1.0, 0.06]} s={[0.04, 0.38, 0.05]} c="#e4e4e0" r={0.3} />
      <Glass p={[0, y0 + h / 2, 0]} s={[pw - 0.12, h - 0.15]} opacity={0.12} />
      {/* 터치 영역 */}
      <mesh position={[0, y0 + h / 2, 0]} {...tapDoor('main')}>
        <boxGeometry args={[pw, h, 0.12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  )
  return (
    <group>
      <SlidePanel id="main" x={d.x0 + pw / 2 - 0.02} w={pw} travel={-(pw - 0.12)} z={-0.035}>
        {panel(1)}
      </SlidePanel>
      <SlidePanel id="main" x={d.x1 - pw / 2 + 0.02} w={pw} travel={pw - 0.12} z={0.035}>
        {panel(-1)}
      </SlidePanel>
    </group>
  )
}

/* 노란 미닫이문 (뒷방) */
function YellowDoor() {
  const d = DOORS.room
  const tex = useMemo(() => latticeTex(), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, transparent: true }), [tex])
  useFrame(() => {
    const a = Math.min(world.fx.partD ?? 1, world.fx.partL ?? 1, world.fx.partR ?? 1)
    mat.opacity = Math.max(0.15, a)
    mat.depthWrite = a > 0.95
  })
  const pw = (d.x1 - d.x0) / 2 + 0.03
  const y0 = FLOOR
  const h = 2.15
  const panel = (
    <>
      <mesh position={[0, y0 + h / 2, 0]} material={mat} {...tapDoor('room')}>
        <primitive object={roundBoxGeo(pw, h, 0.05)} attach="geometry" />
      </mesh>
    </>
  )
  return (
    <group>
      {/* 노란 문틀 */}
      <Box p={[(d.x0 + d.x1) / 2, y0 + h + 0.04, d.z]} s={[d.x1 - d.x0 + 0.16, 0.08, 0.2]} c="#f0c419" r={0.6} />
      <Box p={[d.x0 - 0.04, y0 + h / 2, d.z]} s={[0.08, h, 0.2]} c="#f0c419" r={0.6} />
      <Box p={[d.x1 + 0.04, y0 + h / 2, d.z]} s={[0.08, h, 0.2]} c="#f0c419" r={0.6} />
      <Box p={[(d.x0 + d.x1) / 2, y0 + 0.02, d.z]} s={[d.x1 - d.x0 + 0.16, 0.04, 0.22]} c="#f0c419" r={0.6} />
      <SlidePanel id="room" x={d.x0 + pw / 2} travel={-(pw - 0.05)} z={d.z - 0.035}>
        {panel}
      </SlidePanel>
      <SlidePanel id="room" x={d.x1 - pw / 2} travel={pw - 0.05} z={d.z + 0.035}>
        {panel}
      </SlidePanel>
    </group>
  )
}

/* 플레이어가 집 안 + 카메라가 바깥쪽이면 정면 샷시를 반투명하게 */
function FrontFade({ children }) {
  const g = useRef()
  const a = useRef(1)
  useFrame(({ camera }, dt) => {
    const p = world.player
    const want = getState().view === 'third' && p.z < 0 && camera.position.z > 0.05 ? 0.12 : 1
    a.current += (want - a.current) * Math.min(1, dt * 6)
    const v = a.current
    g.current.traverse((o) => {
      if (!o.isMesh || o.userData.glass) return
      const m = o.material
      if (m.userData.baseOpacity === undefined) m.userData.baseOpacity = m.opacity
      m.transparent = true
      m.opacity = m.userData.baseOpacity * v
      m.depthWrite = v > 0.95
    })
  })
  return <group ref={g}>{children}</group>
}

/* 벽에 붙이는 창문 장식 */
function WinDeco({ p, w = 1.2, h = 0.9, rot = 0, frame = WHITE_FRAME }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0, 0]} s={[w + 0.1, h + 0.1, 0.03]} c={frame} r={0.5} />
      <Box p={[0, 0, 0.02]} s={[w - 0.06, h - 0.06, 0.02]} c="#6f8a98" r={0.1} m={0.3} />
      <Box p={[0, 0, 0.035]} s={[0.04, h, 0.02]} c={frame} r={0.5} />
    </group>
  )
}

/* ───────── 벽 (카메라를 가리면 반투명) ───────── */
function Walls() {
  const md = DOORS.main
  const rd = DOORS.room
  return (
    <group>
      {/* 본채 외벽 */}
      <FadeBox x0={-6} x1={6} z0={-7.08} z1={-6.92} y0={0} y1={TOP} c={CREAM} />
      <FadeBox x0={5.92} x1={6.08} z0={-7} z1={0.06} y0={0} y1={TOP} c={CREAM} />
      <WinDeco p={[6.1, 1.75, -3.2]} rot={Math.PI / 2} w={1.3} />
      {/* 정면: 통유리 샷시 + 위쪽 벽 + 부엌 벽 (안에 들어가면 카메라 쪽 샷시는 흐릿하게) */}
      <FrontFade>
        <SashFrame x0={-6} x1={-4.0} mid />
        <SashFrame x0={-4.0} x1={md.x0} mid />
        <SashFrame x0={md.x1} x1={2} />
        <GlassDoor />
      </FrontFade>
      <FadeBox x0={-6} x1={2} z0={-0.06} z1={0.06} y0={2.55} y1={TOP} c={CREAM} />
      <FadeBox x0={2} x1={6} z0={-0.06} z1={0.06} y0={FLOOR} y1={TOP} c={CREAM} />
      <WinDeco p={[4.0, 1.85, 0.07]} w={1.4} h={0.8} />
      {/* 거실 ↔ 뒷방 칸막이 */}
      <FadeBox x0={-6} x1={rd.x0 - 0.08} z0={-4.07} z1={-3.93} y0={FLOOR} y1={TOP} c="#f6eedc" tag="partL" />
      <FadeBox x0={rd.x1 + 0.08} x1={2} z0={-4.07} z1={-3.93} y0={FLOOR} y1={TOP} c="#f6eedc" tag="partR" />
      <FadeBox x0={rd.x0 - 0.08} x1={rd.x1 + 0.08} z0={-4.07} z1={-3.93} y0={FLOOR + 2.23} y1={TOP} c="#f6eedc" tag="partD" />
      <FadeBox x0={1.93} x1={2.07} z0={-7} z1={-3.93} y0={FLOOR} y1={TOP} c="#f6eedc" />
      {/* 거실·부엌 경계 나무 기둥 */}
      <Box p={[2, FLOOR + 1.33, -0.12]} s={[0.16, 2.65, 0.16]} c={WOOD} />
      <Box p={[2, FLOOR + 1.33, -3.85]} s={[0.16, 2.65, 0.16]} c={WOOD} />
      <Box p={[2, TOP - 0.12, -2]} s={[0.16, 0.24, 3.9]} c={WOOD} />
      <YellowDoor />
    </group>
  )
}

/* ───────── ㄱ자 창고채 (크림 벽 + 회색 걸레받이 + 철문 + 쪽문 + 헛간) ───────── */
function Wing() {
  const X = -5.97
  return (
    <group>
      <FadeBox x0={-10.5} x1={-6} z0={-7} z1={5} y0={0} y1={3.0} c={CREAM} />
      {/* 회색 걸레받이 */}
      <Box p={[X + 0.01, 0.13, 2.5]} s={[0.06, 0.26, 5]} c="#c9c3bb" raycast={() => null} />
      <Box p={[-8.25, 0.13, 5.02]} s={[4.5, 0.26, 0.06]} c="#c9c3bb" raycast={() => null} />
      {/* 쪽문 (유리창 달린 갈색 문) */}
      <group position={[X + 0.03, 0, 4.25]} rotation={[0, Math.PI / 2, 0]}>
        <Box p={[0, 1.05, 0]} s={[0.95, 2.1, 0.04]} c="#9a8e7c" r={0.7} />
        <Box p={[0, 1.45, 0.025]} s={[0.66, 0.85, 0.02]} c="#3c4a52" r={0.2} m={0.2} />
        {[0.25, 0.4, 0.55, 0.7].map((y) => (
          <Box key={y} p={[0, y, 0.025]} s={[0.7, 0.03, 0.01]} c="#7a6e5c" />
        ))}
      </group>
      {/* 회색 철문 (양문) */}
      <group position={[X + 0.03, 0, 2.65]} rotation={[0, Math.PI / 2, 0]}>
        <Box p={[0, 1.1, 0]} s={[1.5, 2.2, 0.06]} c="#b9c3c6" r={0.6} m={0.2} />
        <Box p={[-0.42, 2.0, 0.03]} s={[0.66, 0.42, 0.02]} c="#2d3236" r={0.3} />
        <Box p={[0.42, 2.0, 0.03]} s={[0.66, 0.42, 0.02]} c="#2d3236" r={0.3} />
        <Box p={[0, 1.15, 0.03]} s={[0.03, 2.3, 0.02]} c="#6c7072" />
        <Box p={[0, 1.15, 0.05]} s={[0.5, 0.05, 0.03]} c="#7a4a2a" m={0.3} />
      </group>
      {/* 헛간 (뚫린 공간) */}
      <group position={[X + 0.02, 0, 0.9]} rotation={[0, Math.PI / 2, 0]}>
        <Box p={[0, 1.2, 0]} s={[1.5, 2.3, 0.04]} c="#8c7c6c" r={1} />
        <Box p={[-0.3, 0.42, 0.35]} s={[0.7, 0.25, 0.5]} c="#3c9b8c" r={0.6} />
        <Cyl p={[-0.3, 0.15, 0.35]} r={0.1} h={0.06} c="#555" rot={[Math.PI / 2, 0, 0]} />
        <Box p={[0.45, 0.3, 0.3]} s={[0.4, 0.6, 0.3]} c="#e9d27a" r={1} />
      </group>
      {/* 갈색 홈통 */}
      <Cyl p={[X + 0.1, 1.5, 3.55]} r={0.06} h={3.0} c={GUTTER} />
      {/* 창고 벽 화분 선반 */}
      <Box p={[X + 0.2, 1.55, 3.55]} s={[0.3, 0.06, 0.5]} c="#c9a27a" />
      <Cyl p={[X + 0.2, 1.68, 3.45]} r={0.08} rb={0.06} h={0.16} c="#d99a7a" />
      <Sph p={[X + 0.2, 1.82, 3.45]} r={0.11} c="#7fb06a" />
    </group>
  )
}

/* ───────── 지붕 · 들보 · 서까래 (3인칭 + 집 안/처마 밑이면 완전히 숨김) ───────── */
function Roofs({ mats }) {
  const geos = useMemo(() => {
    const y0 = 3.15
    const y1 = 4.75
    const [X0, X1, Z0, Z1, RZ, RX] = [-6.35, 6.35, -7.45, 0.45, -3.5, 2.4]
    const A = [X0, y0, Z1]
    const B = [X1, y0, Z1]
    const C = [X1, y0, Z0]
    const D = [X0, y0, Z0]
    const R1 = [-RX, y1, RZ]
    const R2 = [RX, y1, RZ]
    const hip = polyGeo([[A, B, R2, R1], [C, D, R1, R2], [B, C, R2], [D, A, R1]], (p, fi) =>
      fi < 2 ? [p[0] * 0.55, p[1] * 1.6] : [p[2] * 0.55, p[1] * 1.6]
    )
    // 창고채 박공지붕 (골함석)
    const w0 = 3.02
    const w1 = 3.9
    const [E, W, S0, S1, RIDGE] = [-5.65, -10.85, -7.45, 5.45, -8.25]
    const wing = polyGeo(
      [
        [[E, w0, S1], [E, w0, S0], [RIDGE, w1, S0], [RIDGE, w1, S1]],
        [[W, w0, S0], [W, w0, S1], [RIDGE, w1, S1], [RIDGE, w1, S0]],
      ],
      (p) => [p[2] * 0.55, p[0] * 0.8]
    )
    const gable = polyGeo([[[-10.5, 3.0, 5.0], [-6, 3.0, 5.0], [RIDGE, 3.78, 5.0]]], () => [0, 0])
    // 처마 (본채 앞 차양)
    const ea = polyGeo([[[-6.05, 2.98, 0.05], [-6.05, 2.6, 3.6], [6.35, 2.6, 3.6], [6.35, 2.98, 0.05]]], (p) => [p[0] * 0.55, p[2] * 0.8])
    return { hip, wing, gable, ea, R1, R2, A, B, C, D, wingEdges: [[[E, w0, S0], [E, w0, S1]], [[W, w0, S0], [W, w0, S1]], [[E, w0, S1], [RIDGE, w1, S1]], [[W, w0, S1], [RIDGE, w1, S1]], [[RIDGE, w1, S0], [RIDGE, w1, S1]]] }
  }, [])

  const bok = useMemo(() => bokTex(), [])
  const roofRef = useRef()
  const eaveRef = useRef()

  useFrame(() => {
    roofRef.current.visible = world.fx.roof > 0.02
    eaveRef.current.visible = world.fx.eave > 0.02
  })

  const { R1, R2, A, B, C, D } = geos
  return (
    <>
      <group ref={roofRef}>
        <mesh geometry={geos.hip} material={mats.tile} />
        {/* 용마루 · 내림마루 */}
        <RidgeRods pairs={[[R1, R2], [R1, A], [R1, D], [R2, B], [R2, C]]} mat={mats.ridge} />
        {/* 둥근 처마 테두리 */}
        <RidgeRods pairs={[[A, B], [B, C], [C, D], [D, A]]} mat={mats.ridge} r={0.1} dy={-0.02} />
        <RidgeRods pairs={geos.wingEdges} mat={mats.ridge} r={0.08} dy={0} />
        {/* 福 장식 */}
        {[
          [R1[0] - 0.12, R1[1] + 0.12, R1[2], -Math.PI / 2],
          [R2[0] + 0.12, R2[1] + 0.12, R2[2], Math.PI / 2],
        ].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[0, r, 0]}>
            <planeGeometry args={[0.45, 0.45]} />
            <primitive object={mats.bok(bok)} attach="material" />
          </mesh>
        ))}
        {/* 나무 처마널 (본채) */}
        <mesh position={[0, 3.1, 0.47]} material={mats.wood}>
          <primitive object={roundBoxGeo(12.8, 0.2, 0.12)} attach="geometry" />
        </mesh>
        <mesh geometry={geos.wing} material={mats.corr} />
        <mesh geometry={geos.gable} material={mats.cream} />
        {/* 천장 들보 · 서까래 */}
        {[-4.5, -2.0, 0.5, 4.0].map((x) => (
          <mesh key={x} position={[x, 3.05, -3.5]} material={mats.beam}>
            <primitive object={roundBoxGeo(0.26, 0.3, 7.2)} attach="geometry" />
          </mesh>
        ))}
        <mesh position={[0, 3.2, -3.5]} material={mats.beam}>
          <primitive object={roundBoxGeo(12, 0.3, 0.3)} attach="geometry" />
        </mesh>
        {Array.from({ length: 15 }, (_, i) => -5.6 + i * 0.8).map((x) => (
          <group key={x}>
            <RafterMesh a={[x, 3.15, 0.3]} b={[x, 4.6, -3.5]} mat={mats.beam} />
            <RafterMesh a={[x, 4.6, -3.5]} b={[x, 3.15, -7.3]} mat={mats.beam} />
          </group>
        ))}
      </group>

      <group ref={eaveRef}>
        <mesh geometry={geos.ea} material={mats.eaveTop} />
        <mesh geometry={geos.ea} material={mats.eaveUnder} position={[0, -0.04, 0]} />
        {/* 나무 처마널 + 갈색 물받이 */}
        <mesh position={[0.15, 2.52, 3.62]} material={mats.wood}>
          <primitive object={roundBoxGeo(12.5, 0.22, 0.14)} attach="geometry" />
        </mesh>
        <mesh position={[0.15, 2.58, 3.72]} rotation={[0, 0, Math.PI / 2]} material={mats.gutter}>
          <cylinderGeometry args={[0.08, 0.08, 12.5, 10, 1, true, 0, Math.PI]} />
        </mesh>
        {/* 초록 철제 도리 */}
        <mesh position={[0.15, 2.55, 3.3]} material={mats.green}>
          <primitive object={roundBoxGeo(12.4, 0.1, 0.1)} attach="geometry" />
        </mesh>
        {[-5.8, -2.6, 0.9, 3.6, 6.2].map((x) => (
          <RafterMesh key={x} a={[x, 2.95, 0.1]} b={[x, 2.56, 3.3]} mat={mats.green} r={0.03} />
        ))}
      </group>
    </>
  )
}

function RidgeRods({ pairs, mat, r = 0.11, dy = 0.06 }) {
  return pairs.map(([a, b], i) => <RafterMesh key={i} a={[a[0], a[1] + dy, a[2]]} b={[b[0], b[1] + dy, b[2]]} mat={mat} r={r} round />)
}

const _up = new THREE.Vector3(0, 1, 0)
function RafterMesh({ a, b, mat, r = 0.06, round }) {
  const { pos, quat, len } = useMemo(() => {
    const A = new THREE.Vector3(...a)
    const B = new THREE.Vector3(...b)
    const d = B.clone().sub(A)
    const len = d.length()
    return { pos: A.clone().add(B).multiplyScalar(0.5), quat: new THREE.Quaternion().setFromUnitVectors(_up, d.normalize()), len }
  }, [a, b])
  return (
    <mesh position={pos} quaternion={quat} material={mat} raycast={() => null}>
      {round ? <capsuleGeometry args={[r, len, 4, 12]} /> : <primitive object={roundBoxGeo(r * 2, len, r * 2, r * 0.7)} attach="geometry" />}
    </mesh>
  )
}

/* ───────── 메인 ───────── */
export default function House() {
  const mats = useMemo(() => {
    const t = (o) => new THREE.MeshStandardMaterial({ transparent: true, side: THREE.DoubleSide, ...o })
    const tile = metalTile()
    tile.repeat.set(1, 1)
    const corr = slateRoof()
    const all = {
      tile: t({ map: tile, roughness: 0.6, metalness: 0.2 }),
      corr: t({ map: corr, roughness: 0.6, metalness: 0.2 }),
      ridge: t({ color: '#a8705f', roughness: 0.7 }),
      wood: t({ color: WOOD, roughness: 0.7 }),
      beam: t({ color: '#c49a70', roughness: 0.8 }),
      cream: t({ color: CREAM, roughness: 1 }),
      eaveTop: t({ map: corr, roughness: 0.6 }),
      eaveUnder: t({ color: '#fff4e6', map: slateRoof(), roughness: 0.8 }),
      gutter: t({ color: GUTTER, roughness: 0.5 }),
      green: t({ color: GREEN, roughness: 0.5 }),
    }
    const bokMats = new Map()
    all._bokList = []
    all.bok = (tex) => {
      if (!bokMats.has(tex)) {
        const m = t({ map: tex, roughness: 0.6 })
        bokMats.set(tex, m)
        all._bokList.push(m)
      }
      return bokMats.get(tex)
    }
    all._roof = ['tile', 'corr', 'ridge', 'wood', 'beam', 'cream']
    all._eave = ['eaveTop', 'eaveUnder', 'gutter', 'green']
    return all
  }, [])

  const tmpA = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const p = world.player
    const third = getState().view === 'third'
    const inside = inHouse(p.x, p.z)
    const underEave = p.x > -6.4 && p.x < 6.8 && p.z > -7.5 && p.z < 3.9
    const fx = world.fx
    fx.roof += ((third && underEave ? 0 : 1) - fx.roof) * Math.min(1, dt * 6)
    fx.eave += ((third && inside ? 0 : 1) - fx.eave) * Math.min(1, dt * 6)
    for (const k of mats._roof) {
      mats[k].opacity = fx.roof
      mats[k].depthWrite = fx.roof > 0.95
    }
    for (const m of mats._bokList) {
      m.opacity = fx.roof
      m.depthWrite = fx.roof > 0.95
    }
    for (const k of mats._eave) {
      mats[k].opacity = fx.eave
      mats[k].depthWrite = fx.eave > 0.95
    }

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
    tmpA.set(p.x, p.y + 0.9, p.z)
    const c = camera.position
    for (const f of world.fades) {
      const block = third && segBox(c, tmpA, f.box)
      f.a += ((block ? 0.14 : 1) - f.a) * Math.min(1, dt * 8)
      f.mat.opacity = f.a
      f.mat.depthWrite = f.a > 0.95
      if (f.tag) fx[f.tag] = f.a
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
