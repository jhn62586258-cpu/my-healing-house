import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { interact, moveTo, openLetter, showToast } from '../store'
import * as audio from '../audio/AsmrEngine'
import { grassTex, plaid } from './textures'
import { Box, Cyl, Sph, Cap, Rod, Hit, soft, roundBoxGeo, roundCylGeo } from './parts'
import { Dog } from './Dogs'
import { SpeechBubble, Hearts, Sparkle } from './Fx'

/* ───────── 정원 상자 받침 (말랑한 둥근 잔디 판) ───────── */
const BASE = { x0: -11.4, x1: 9.0, z0: -8.1, z1: 7.7 }
function roundRectShape(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}
function Ground() {
  const grass = useMemo(() => grassTex(), [])
  const W = BASE.x1 - BASE.x0
  const D = BASE.z1 - BASE.z0
  const cx = (BASE.x0 + BASE.x1) / 2
  const cz = (BASE.z0 + BASE.z1) / 2
  const soil = useMemo(() => roundBoxGeo(W, 1.3, D, 0.45), [W, D])
  const top = useMemo(() => {
    const g = new THREE.ShapeGeometry(roundRectShape(W - 0.5, D - 0.5, 0.6), 8)
    // uv 반복
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.5, uv.getY(i) / 2.5)
    return g
  }, [W, D])
  const stones = useMemo(() => {
    const out = []
    const a = [2.5, 6.6]
    const b = [-0.4, 1.0]
    for (let i = 0; i <= 7; i++) {
      const u = i / 7
      out.push([a[0] + (b[0] - a[0]) * u + Math.sin(i * 1.7) * 0.15, a[1] + (b[1] - a[1]) * u, 0.19 + (i % 3) * 0.03])
    }
    return out
  }, [])
  return (
    <group>
      <mesh geometry={soil} position={[cx, -0.66, cz]} onClick={moveTo}>
        <meshStandardMaterial color="#d8b48e" roughness={1} />
      </mesh>
      {/* 흙 층 줄무늬 */}
      <mesh geometry={roundBoxGeo(W + 0.02, 0.14, D + 0.02, 0.07)} position={[cx, -0.9, cz]} raycast={() => null}>
        <meshStandardMaterial color="#c79f7a" roughness={1} />
      </mesh>
      <mesh geometry={top} rotation-x={-Math.PI / 2} position={[cx, 0.006, cz]} onClick={moveTo} userData={{ noCast: true }}>
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      {/* 대문에서 댓돌까지 동글동글 디딤돌 */}
      {stones.map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.03, z]} scale={[1, 0.25, 0.85]} onClick={moveTo}>
          <sphereGeometry args={[r * 1.4, 18, 10]} />
          <meshStandardMaterial color={i % 2 ? '#e9e0d0' : '#ddd3c2'} roughness={1} />
        </mesh>
      ))}
      {/* 창고채 앞 흙마당 */}
      <mesh geometry={roundBoxGeo(1.6, 0.04, 4.6, 0.02)} position={[-5.1, 0.02, 1.4]} onClick={moveTo}>
        <meshStandardMaterial color="#ecdcc0" roughness={1} />
      </mesh>
      {/* 낙엽 몇 장 */}
      {useMemo(
        () =>
          Array.from({ length: 22 }, (_, i) => {
            const x = -5 + Math.random() * 12
            const z = 3.8 + Math.random() * 2.2
            return (
              <mesh key={i} position={[x, 0.015, z]} rotation={[-Math.PI / 2, 0, Math.random() * 6]} raycast={() => null} userData={{ noCast: true }}>
                <circleGeometry args={[0.06, 6]} />
                <meshStandardMaterial color={['#e6a676', '#d99a6a', '#efc27e'][i % 3]} roughness={1} />
              </mesh>
            )
          }),
        []
      )}
    </group>
  )
}

/* ───────── 나무 울타리 (둥근 말뚝 + 가로대) ───────── */
const FENCE = '#ecd3ad'
function FenceRun({ a, b }) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  const n = Math.max(2, Math.round(len / 0.36))
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
  const posts = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    posts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u])
  }
  const mx = (a[0] + b[0]) / 2
  const mz = (a[1] + b[1]) / 2
  return (
    <group>
      {posts.map(([x, z], i) => (
        <Cap key={i} p={[x, 0.42, z]} r={0.065} len={0.62} c={FENCE} />
      ))}
      {[0.3, 0.6].map((y) => (
        <Box key={y} p={[mx, y, mz]} s={[len, 0.07, 0.06]} rot={[0, -ang, 0]} c="#e2c49a" rad={0.03} />
      ))}
    </group>
  )
}
function Walls() {
  return (
    <group>
      <FenceRun a={[-6.25, 6.9]} b={[1.65, 6.9]} />
      <FenceRun a={[3.35, 6.9]} b={[8.4, 6.9]} />
      <FenceRun a={[8.4, 6.9]} b={[8.4, -7.15]} />
      <FenceRun a={[8.4, -7.15]} b={[6.1, -7.15]} />
      {/* 대문 기둥 (동글 머리) */}
      {[1.6, 3.4].map((x) => (
        <group key={x}>
          <Cap p={[x, 0.5, 6.9]} r={0.1} len={0.8} c="#d9b58a" />
          <Sph p={[x, 1.02, 6.9]} r={0.12} c="#f2d9b0" />
        </group>
      ))}
      {/* 뒤뜰 동글 덤불 */}
      {[-10.6, -9.2, -7.6, -5.8, -3.9, -2.2, -0.4, 1.4, 3.2, 5.0].map((x, i) => (
        <Sph key={i} p={[x, 0.42, -7.65]} r={0.55 + (i % 3) * 0.1} sc={[1.2, 0.85, 0.8]} c={i % 2 ? '#a9cf8c' : '#9cc483'} />
      ))}
      {[-6.6, -8.3, -10.1].map((x, i) => (
        <Sph key={'s' + i} p={[x, 0.4, 6.0 - i * 0.3]} r={0.55} sc={[1.1, 0.85, 1]} c="#a6cc88" />
      ))}
    </group>
  )
}

/* ───────── 꽃밭 ───────── */
const FLOWER = ['#ffb7c5', '#ffe08a', '#c9b6f2', '#ffffff', '#ffc9a3', '#f7a8b8']
function FlowerBed({ x0, x1, z0, z1, seed = 1 }) {
  const items = useMemo(() => {
    const out = []
    let k = seed
    const rnd = () => ((k = (k * 9301 + 49297) % 233280) / 233280)
    const n = Math.round((x1 - x0) * (z1 - z0) * 14)
    for (let i = 0; i < n; i++) out.push([x0 + 0.1 + rnd() * (x1 - x0 - 0.2), z0 + 0.1 + rnd() * (z1 - z0 - 0.2), 0.18 + rnd() * 0.2, FLOWER[i % FLOWER.length]])
    return out
  }, [x0, x1, z0, z1, seed])
  return (
    <group>
      <Box p={[(x0 + x1) / 2, 0.07, (z0 + z1) / 2]} s={[x1 - x0, 0.16, z1 - z0]} c="#b99474" rad={0.07} />
      {items.map(([x, z, h, c], i) => (
        <group key={i} position={[x, 0.12, z]}>
          <mesh position={[0, h / 2, 0]}>
            <capsuleGeometry args={[0.012, h, 3, 6]} />
            <meshStandardMaterial color="#8fbf7a" />
          </mesh>
          <mesh position={[0.03, h * 0.35, 0]} rotation={[0, 0, -0.8]} scale={[1, 0.4, 0.6]}>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshStandardMaterial color="#9ccb85" />
          </mesh>
          <mesh position={[0, h + 0.03, 0]} scale={[1, 0.8, 1]}>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshStandardMaterial color={c} roughness={0.8} />
          </mesh>
          <mesh position={[0, h + 0.07, 0]}>
            <sphereGeometry args={[0.02, 8, 6]} />
            <meshStandardMaterial color="#ffe9a8" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ───────── 작은 텃밭 (배추 · 상추 · 대파) ───────── */
function Veggie() {
  return (
    <group>
      <Box p={[-1.15, 0.12, 5.65]} s={[2.7, 0.24, 0.95]} c="#d3b08a" rad={0.1} />
      <Box p={[-1.15, 0.2, 5.65]} s={[2.5, 0.1, 0.78]} c="#a98466" rad={0.05} />
      {[-2.2, -1.6, -1.0].map((x, i) => (
        <group key={i} position={[x, 0.3, 5.45]}>
          <Sph p={[0, 0.06, 0]} r={0.13} sc={[1, 0.9, 1]} c="#c5e3a6" />
          {[0, 1, 2, 3].map((k) => (
            <Sph key={k} p={[Math.cos(k * 1.57) * 0.1, 0.03, Math.sin(k * 1.57) * 0.1]} r={0.1} sc={[1, 0.55, 1]} c="#9fd08a" />
          ))}
        </group>
      ))}
      {[-2.2, -1.6, -1.0].map((x, i) => (
        <Sph key={'l' + i} p={[x + 0.1, 0.32, 5.85]} r={0.1} sc={[1.2, 0.6, 1]} c="#b6dc8e" />
      ))}
      {[-0.4, -0.25, -0.1, 0.05].map((x, i) => (
        <group key={'p' + i}>
          <Cap p={[x, 0.45, 5.5 + (i % 2) * 0.25]} r={0.022} len={0.3} c="#8fc47a" />
          <Cap p={[x, 0.3, 5.5 + (i % 2) * 0.25]} r={0.025} len={0.06} c="#f6f3e6" />
        </group>
      ))}
      {/* 이름표 */}
      <Cap p={[0.08, 0.35, 6.05]} r={0.02} len={0.3} c="#c9a27a" />
      <Box p={[0.08, 0.58, 6.07]} s={[0.36, 0.2, 0.04]} c="#fff1d6" rad={0.05} />
    </group>
  )
}

/* ───────── 평상 (감 한 접시) ───────── */
function Pyeongsang() {
  const hearts = useRef()
  const pos = [4.8, 0, 1.9]
  const act = () => {
    hearts.current.burst()
    audio.squish()
    showToast('🍊 말랑말랑 홍시 하나 냠냠~ 달다!')
  }
  return (
    <group>
      <Box p={[4.8, 0.36, 1.9]} s={[1.7, 0.1, 1.3]} c="#e3c49b" rad={0.05} />
      {[-0.7, -0.35, 0, 0.35, 0.7].map((dx) => (
        <Box key={dx} p={[4.8 + dx, 0.415, 1.9]} s={[0.3, 0.02, 1.25]} c="#ecd2ac" rad={0.01} />
      ))}
      {[
        [-0.75, -0.55],
        [0.75, -0.55],
        [-0.75, 0.55],
        [0.75, 0.55],
      ].map(([dx, dz], i) => (
        <Cyl key={i} p={[4.8 + dx, 0.16, 1.9 + dz]} r={0.07} h={0.32} c="#c9a07a" />
      ))}
      <Box p={[4.35, 0.47, 2.15]} s={[0.5, 0.08, 0.5]} c="#f7c1b8" rad={0.04} />
      <group position={[5.15, 0.45, 1.7]} {...interact('🍊 평상 위 홍시 한 접시', act, pos, 2.2)}>
        <Cyl p={[0, 0.02, 0]} r={0.22} rb={0.16} h={0.05} c="#f6f1e6" />
        {[
          [0, 0.09, 0],
          [0.09, 0.08, 0.06],
          [-0.09, 0.08, 0.05],
          [0.02, 0.08, -0.09],
        ].map((p, i) => (
          <group key={i} position={p}>
            <Sph p={[0, 0, 0]} r={0.065} sc={[1, 0.85, 1]} c="#ffa25a" />
            <Sph p={[0, 0.055, 0]} r={0.03} sc={[1.2, 0.4, 1.2]} c="#8cbf74" />
          </group>
        ))}
        <Hearts ref={hearts} y={0.3} ch="🧡" />
      </group>
    </group>
  )
}

/* ───────── 뭉게구름 ───────── */
function Clouds() {
  const g = useRef()
  useFrame(({ clock }) => {
    g.current.position.x = Math.sin(clock.elapsedTime * 0.03) * 4
  })
  const puffs = [
    [-14, 13, -26, 1.2],
    [6, 15, -30, 1.5],
    [20, 12, -18, 1.0],
    [-24, 11, -6, 1.1],
  ]
  return (
    <group ref={g}>
      {puffs.map(([x, y, z, s], i) => (
        <group key={i} position={[x, y, z]} scale={s}>
          {[
            [0, 0, 0, 1.6],
            [1.5, -0.2, 0.2, 1.2],
            [-1.5, -0.3, 0.1, 1.1],
            [0.6, 0.7, 0, 1.0],
          ].map(([a, b, c, r], k) => (
            <mesh key={k} position={[a, b, c]} raycast={() => null} userData={{ noCast: true }}>
              <sphereGeometry args={[r, 18, 14]} />
              <meshStandardMaterial color="#ffffff" roughness={1} emissive="#fff6ea" emissiveIntensity={0.35} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/* ───────── 빨간 우체통 → 엄마의 편지 ───────── */
function Mailbox() {
  const flag = useRef()
  const kick = useRef(0)
  useFrame(({ clock }, dt) => {
    kick.current = Math.max(0, kick.current - dt * 2)
    flag.current.rotation.z = -kick.current * 1.2 + Math.sin(clock.elapsedTime * 2) * 0.03
  })
  const pos = [3.55, 0, 5.9]
  const act = () => {
    kick.current = 1
    audio.paper()
    openLetter()
  }
  return (
    <group position={pos} {...interact('📮 빨간 우체통 (엄마의 편지가 와 있어요)', act, pos, 2.2)}>
      <Cyl p={[0, 0.5, 0]} r={0.05} h={1.0} c="#b08a6a" />
      <group position={[0, 1.15, 0]}>
        <Box p={[0, 0, 0]} s={[0.42, 0.32, 0.55]} c="#e86a5e" r={0.5} rad={0.07} />
        <mesh position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.21, 0.21, 0.55, 16, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={soft('#e86a5e')} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
        <Box p={[0, 0.02, -0.28]} s={[0.25, 0.04, 0.01]} c="#3a1a12" />
        <group ref={flag} position={[0.22, 0.05, 0.12]}>
          <Box p={[0.01, 0.15, 0]} s={[0.02, 0.3, 0.03]} c="#f3d34a" />
          <Box p={[0.01, 0.27, -0.06]} s={[0.02, 0.08, 0.12]} c="#f3d34a" />
        </group>
        {/* 삐죽 나온 편지 */}
        <Box p={[0, 0.1, -0.3]} s={[0.18, 0.12, 0.02]} c="#fff4dc" rot={[0.2, 0, 0]} />
      </group>
      <Sparkle p={[0, 1.75, 0]} />
    </group>
  )
}

/* ───────── 파란 지붕 개집 + 누렁이 ───────── */
function DoghouseNureongi() {
  const dog = useRef()
  const bubble = useRef()
  const pos = [-4.15, 0, 5.35]
  const act = () => {
    dog.current.wag(2)
    audio.bark(1.15, 2)
    bubble.current.say('멍! 멍!', 1800)
  }
  return (
    <group>
      <group position={[-5.2, 0, 4.45]} rotation={[0, Math.PI / 2, 0]}>
        <Box p={[0, 0.38, 0]} s={[1.0, 0.76, 1.05]} c="#efe4d2" rad={0.12} />
        <mesh position={[0, 0.34, 0.52]} scale={[1, 1.15, 1]}>
          <circleGeometry args={[0.22, 24]} />
          <meshStandardMaterial color="#6e5a4c" />
        </mesh>
        {/* 둥근 파란 지붕 */}
        <mesh position={[-0.27, 0.92, 0]} rotation={[0, 0, 0.62]}>
          <primitive object={roundBoxGeo(0.7, 0.1, 1.25, 0.05)} attach="geometry" />
          <meshStandardMaterial color={soft('#5f9bd6')} roughness={0.7} />
        </mesh>
        <mesh position={[0.27, 0.92, 0]} rotation={[0, 0, -0.62]}>
          <primitive object={roundBoxGeo(0.7, 0.1, 1.25, 0.05)} attach="geometry" />
          <meshStandardMaterial color={soft('#5f9bd6')} roughness={0.7} />
        </mesh>
        <Box p={[0, 0.66, 0.55]} s={[0.35, 0.14, 0.03]} c="#fff6e0" rad={0.03} />
      </group>
      {/* 밥그릇 2개 */}
      <Cyl p={[-4.55, 0.05, 3.75]} r={0.12} rb={0.1} h={0.08} c="#dfe3e6" />
      <Cyl p={[-4.2, 0.05, 3.8]} r={0.12} rb={0.1} h={0.08} c="#f2c6c6" />
      <group position={pos} rotation={[0, 1.6, 0]} {...interact('🐕 개집 옆 누렁이', act, pos, 2.3)}>
        <Dog ref={dog} pose="stand" kind="jindo" color="#e8c286" light="#f7e2bb" size={0.95} leash />
        <SpeechBubble ref={bubble} y={1.3} scale={0.8} />
      </group>
      <Rod a={[-4.0, 0.5, 5.35]} b={[-4.75, 0.06, 4.9]} r={0.013} c="#e98f8f" />
    </group>
  )
}

/* ───────── 고무 다라이 + 고무 화분 (파스텔 코랄) ───────── */
function RubberTubs() {
  const water = useRef()
  useFrame(({ clock }) => {
    water.current.material.emissiveIntensity = 0.12 + Math.sin(clock.elapsedTime * 3) * 0.04
  })
  const coral = soft('#e9826f')
  return (
    <group>
      <group position={[-3.25, 0, 4.2]}>
        <mesh position={[0, 0.17, 0]} geometry={roundCylGeo(0.48, 0.4, 0.34, 28, 0.06)}>
          <meshStandardMaterial color={coral} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.34, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.47, 0.04, 10, 28]} />
          <meshStandardMaterial color={coral} roughness={0.7} />
        </mesh>
        <mesh ref={water} position={[0, 0.345, 0]} rotation-x={-Math.PI / 2} userData={{ noCast: true }}>
          <circleGeometry args={[0.44, 28]} />
          <meshStandardMaterial color="#bfe0ec" emissive="#d9f1fa" emissiveIntensity={0.12} roughness={0.15} />
        </mesh>
        {/* 고무 오리 */}
        <Sph p={[0.1, 0.39, 0.05]} r={0.06} c="#ffe08a" />
        <Sph p={[0.14, 0.45, 0.07]} r={0.04} c="#ffe08a" />
        <Sph p={[0.18, 0.445, 0.08]} r={0.015} c="#ffb26b" />
      </group>
      {[
        [6.55, 3.75, 0.22],
        [-2.1, 3.75, 0.25],
        [-5.55, 3.75, 0.2],
      ].map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, r * 0.85, 0]} geometry={roundCylGeo(r, r * 0.75, r * 1.7, 22, 0.04)}>
            <meshStandardMaterial color={soft('#d9876a')} roughness={0.8} />
          </mesh>
          <Sph p={[0, r * 1.8, 0]} r={r * 0.9} sc={[1, 0.7, 1]} c={i === 1 ? '#f4b7c3' : '#9fcf86'} />
        </group>
      ))}
    </group>
  )
}

/* ───────── 장독대 ───────── */
function Onggi({ p, s = 1 }) {
  const geo = useMemo(() => {
    const pts = [
      [0.0, 0],
      [0.18, 0],
      [0.26, 0.12],
      [0.32, 0.32],
      [0.31, 0.48],
      [0.22, 0.6],
      [0.19, 0.64],
      [0.2, 0.67],
      [0.0, 0.67],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 24)
  }, [])
  return (
    <group position={p} scale={s}>
      <mesh geometry={geo}>
        <meshStandardMaterial color={soft('#7a5444')} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.7, 0]} scale={[1, 0.35, 1]}>
        <sphereGeometry args={[0.22, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={soft('#6e4c3e')} roughness={0.4} />
      </mesh>
    </group>
  )
}
function Jangdokdae() {
  return (
    <group>
      <Box p={[7.35, 0.13, -3.4]} s={[1.75, 0.26, 4.4]} c="#d9cdbb" rad={0.12} />
      {[
        [6.95, -5.0, 0.95],
        [7.75, -4.9, 1.1],
        [7.0, -3.9, 0.8],
        [7.8, -3.75, 0.9],
        [7.0, -2.85, 0.7],
        [7.75, -2.75, 0.75],
        [7.35, -1.8, 0.6],
      ].map(([x, z, s], i) => (
        <Onggi key={i} p={[x, 0.26, z]} s={s} />
      ))}
    </group>
  )
}

/* ───────── 감나무 + 백구 + 낙엽 다람쥐 ───────── */
function PersimmonTree() {
  const leaves = useMemo(() => {
    const out = []
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const r = i % 2 ? 0.75 : 0.45
      out.push([Math.cos(a) * r, 2.35 + (i % 3) * 0.3, Math.sin(a) * r, 0.62 + (i % 3) * 0.08])
    }
    out.push([0, 3.05, 0, 0.8])
    return out
  }, [])
  const fruits = useMemo(() => leaves.slice(0, 12).map(([x, y, z, s]) => [x * 1.55, y - s * 0.35, z * 1.55]), [leaves])
  const crown = useRef()
  useFrame(({ clock }) => {
    crown.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.015
  })
  return (
    <group position={[6.6, 0, 5.2]}>
      <Cyl p={[0, 0.95, 0]} r={0.16} rb={0.24} h={1.9} c="#a98266" />
      <group ref={crown}>
        <Rod a={[0, 1.7, 0]} b={[-0.6, 2.4, 0.3]} r={0.08} c="#a98266" />
        <Rod a={[0, 1.7, 0]} b={[0.55, 2.5, -0.3]} r={0.08} c="#a98266" />
        {leaves.map(([x, y, z, s], i) => (
          <Sph key={i} p={[x, y, z]} r={s} sc={[1, 0.85, 1]} c={i % 3 ? '#8fc47a' : '#a3d08a'} seg={20} />
        ))}
        {fruits.map((p, i) => (
          <Sph key={'f' + i} p={p} r={0.1} c="#ff9a4a" seg={14} rough={0.5} />
        ))}
      </group>
    </group>
  )
}

function Baekgu() {
  const dog = useRef()
  const bubble = useRef()
  const pos = [5.35, 0, 5.4]
  const act = () => {
    dog.current.wag(2)
    audio.bark(1.0, 1)
    bubble.current.say('멍! 🐾', 1800)
  }
  return (
    <group position={pos} rotation={[0, -2.6, 0]} {...interact('🐶 감나무 아래 하얀 백구', act, pos, 2.3)}>
      <Dog ref={dog} pose="sit" kind="jindo" color="#fffaf0" light="#ffffff" size={1.0} leash />
      <SpeechBubble ref={bubble} y={1.45} scale={0.8} />
    </group>
  )
}

function SquirrelLeaves() {
  const sq = useRef()
  const pile = useRef()
  const hop = useRef(0)
  const hearts = useRef()
  const leafs = useMemo(
    () =>
      Array.from({ length: 45 }, (_, i) => {
        const a = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.random()) * 0.45
        return [Math.cos(a) * r, 0.02 + (0.65 - r) * 0.35 * Math.random(), Math.sin(a) * r, Math.random() * 6, ['#eeaa78', '#e39a6c', '#f2c47e', '#d9946a'][i % 4]]
      }),
    []
  )
  useFrame(({ clock }, dt) => {
    hop.current = Math.max(0, hop.current - dt * 1.2)
    const h = hop.current
    sq.current.position.y = 0.05 + Math.abs(Math.sin(h * Math.PI * 3)) * 0.35 * h
    sq.current.rotation.y = -0.6 + Math.sin(clock.elapsedTime * 0.8) * 0.3 + h * 6
    pile.current.rotation.y = Math.sin(clock.elapsedTime * 25) * 0.04 * h
  })
  const pos = [7.55, 0, 3.55]
  const act = () => {
    hop.current = 1
    audio.leaves(2.4)
    setTimeout(() => audio.squirrel(), 300)
    hearts.current.burst()
  }
  return (
    <group position={pos} {...interact('🐿️ 낙엽 더미와 다람쥐 (바스락)', act, pos, 2.3)}>
      <group ref={pile}>
        {leafs.map(([x, y, z, r, c], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[-Math.PI / 2 + (i % 5) * 0.2, 0, r]}>
            <circleGeometry args={[0.07, 5]} />
            <meshStandardMaterial color={c} roughness={1} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      <group ref={sq} position={[-0.2, 0.05, 0.45]}>
        <Sph p={[0, 0.15, 0]} r={0.1} sc={[0.9, 1.1, 1.2]} c="#c08a62" />
        <Sph p={[0, 0.3, 0.08]} r={0.07} c="#c08a62" />
        <Sph p={[0, 0.27, 0.14]} r={0.025} c="#f0dcc0" />
        <Sph p={[-0.035, 0.37, 0.07]} r={0.02} c="#c08a62" />
        <Sph p={[0.035, 0.37, 0.07]} r={0.02} c="#c08a62" />
        <Sph p={[0, 0.27, -0.15]} r={0.09} sc={[0.8, 1.6, 0.8]} c="#d39a6e" />
        <Sph p={[0.02, 0.31, 0.13]} r={0.016} c="#2a2220" raw />
      </group>
      <Hearts ref={hearts} y={0.6} ch="🍂" />
      <Sparkle p={[0, 0.7, 0]} />
    </group>
  )
}

/* ───────── 처마 빨랫줄 (분홍 수건 · 체크 담요 · 흰 수건 · 파란 수건) ───────── */
function Laundry() {
  const items = useRef([])
  const blanket = useMemo(() => plaid('#df8a80', '#fbf1e2', '#b26a64', [2, 2]), [])
  const list = [
    { x: -5.3, w: 0.6, h: 0.75, c: '#f6b0ab' },
    { x: -4.4, w: 1.0, h: 1.05, map: blanket },
    { x: -3.55, w: 0.5, h: 0.65, c: '#f4f2ec' },
    { x: -3.0, w: 0.5, h: 0.6, c: '#9fb8e6' },
  ]
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    items.current.forEach((m, i) => {
      if (m) m.rotation.x = Math.sin(t * 1.3 + i) * 0.07
    })
  })
  const Y = 2.35
  const Z = 2.2
  return (
    <group>
      <Rod a={[-5.85, Y, Z]} b={[-2.55, Y, Z]} r={0.008} c="#dddddd" />
      {list.map((it, i) => (
        <group key={i} ref={(el) => (items.current[i] = el)} position={[it.x, Y, Z]}>
          <mesh position={[0, -it.h / 2, 0]} raycast={() => null} geometry={roundBoxGeo(it.w, it.h, 0.04, 0.02)}>
            <meshStandardMaterial color={it.map ? '#ffffff' : it.c} map={it.map} roughness={1} />
          </mesh>
          <Box p={[0, 0.0, 0.025]} s={[it.w + 0.02, 0.04, 0.03]} c={it.map ? '#8a2420' : it.c} />
        </group>
      ))}
    </group>
  )
}

/* ───────── 처마 풍경 (터치하면 땡그랑) ───────── */
function WindBell() {
  const g = useRef()
  const swing = useRef(0)
  useFrame(({ clock }, dt) => {
    swing.current = Math.max(0, swing.current - dt * 0.5)
    const t = clock.elapsedTime
    g.current.rotation.z = Math.sin(t * 1.4) * 0.06 + Math.sin(t * 9) * swing.current * 0.5
    g.current.rotation.x = Math.sin(t * 7) * swing.current * 0.3
  })
  const pos = [2.0, 0, 3.15]
  const act = () => {
    swing.current = 1
    audio.windBell()
  }
  return (
    <group position={[2.0, 2.6, 3.15]}>
      <group ref={g} {...interact('🎐 처마 끝 풍경 (땡그랑)', act, pos, 2.6)}>
        <Cyl p={[0, -0.12, 0]} r={0.006} h={0.24} c="#555" />
        <mesh position={[0, -0.32, 0]}>
          <cylinderGeometry args={[0.05, 0.11, 0.18, 16, 1, true]} />
          <meshStandardMaterial color="#c9b98a" metalness={0.5} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
        <Sph p={[0, -0.25, 0]} r={0.05} sc={[1, 0.6, 1]} c="#c9b98a" />
        <Cyl p={[0, -0.47, 0]} r={0.005} h={0.25} c="#555" />
        {/* 물고기 모양 바람판 */}
        <mesh position={[0, -0.66, 0]}>
          <capsuleGeometry args={[0.05, 0.08, 4, 10]} />
          <meshStandardMaterial color="#9cc4ef" />
        </mesh>
        <Hit p={[0, -0.4, 0]} s={[0.45, 0.9, 0.45]} />
      </group>
      <Sparkle p={[0, 0.05, 0]} />
    </group>
  )
}

/* ───────── 초록 철제 기둥 (처마) + 갈색 홈통 ───────── */
function EavePosts() {
  return (
    <group>
      {[-5.8, -2.6, 0.9, 3.6, 6.2].map((x) => (
        <Cyl key={x} p={[x, 1.29, 3.3]} r={0.06} h={2.58} c="#8cc0a0" raw />
      ))}
      <Cyl p={[6.2, 1.3, 3.55]} r={0.055} h={2.5} c="#cf9c7c" raw />
      <Cyl p={[-5.85, 1.3, 3.55]} r={0.055} h={2.5} c="#cf9c7c" raw />
    </group>
  )
}

/* ───────── 뒷산 (파스텔 동글 능선 + 바위 봉우리) ───────── */
function Mountains() {
  const hills = [
    [-26, -40, 22, 13, 10, '#a9c79a'],
    [-4, -46, 24, 17, 11, '#9fbf92'],
    [20, -42, 22, 14, 10, '#adc99d'],
    [-40, -18, 16, 9, 12, '#b6d0a6'],
    [38, -20, 16, 9, 12, '#b6d0a6'],
  ]
  return (
    <group>
      {hills.map(([x, z, r, h, d, c], i) => (
        <mesh key={i} position={[x, -3, z]} scale={[r, h, d]} raycast={() => null} userData={{ noCast: true }}>
          <sphereGeometry args={[1, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={c} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 12.5, -45]} scale={[3.2, 2.4, 2.4]} raycast={() => null} userData={{ noCast: true }}>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color="#d9d6cc" roughness={1} />
      </mesh>
      {/* 집 뒤 둥근 소나무 */}
      {[
        [-3, -9.3],
        [2.5, -9.6],
        [7.5, -9.0],
        [-9, -9.4],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Cyl p={[0, 1.0, 0]} r={0.16} h={2} c="#a98266" />
          <Sph p={[0, 2.6, 0]} r={1.25} sc={[1, 1.15, 1]} c="#8dbb84" />
          <Sph p={[0, 3.7, 0]} r={0.85} c="#99c58e" />
        </group>
      ))}
    </group>
  )
}

export default function Yard() {
  return (
    <group>
      <Ground />
      <Walls />
      <FlowerBed x0={-5.95} x1={-2.8} z0={6.2} z1={6.85} seed={3} />
      <FlowerBed x0={3.9} x1={7.9} z0={6.2} z1={6.85} seed={7} />
      <FlowerBed x0={7.85} x1={8.3} z0={-0.6} z1={2.8} seed={11} />
      <Veggie />
      <Pyeongsang />
      <Mailbox />
      <DoghouseNureongi />
      <RubberTubs />
      <Jangdokdae />
      <PersimmonTree />
      <Baekgu />
      <SquirrelLeaves />
      <Laundry />
      <WindBell />
      <EavePosts />
      <Mountains />
      <Clouds />
    </group>
  )
}
