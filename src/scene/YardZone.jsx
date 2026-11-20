import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { getState, useStore, interact, moveTo, toggleRain, showToast } from '../store'
import * as audio from '../audio/AsmrEngine'
import { Box, Cyl, Sph, HitCyl } from './parts'

const rnd = (a, b) => a + Math.random() * (b - a)

/* ───────── 마당 바닥 ───────── */
function Ground() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} onClick={moveTo}>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color="#66794b" roughness={1} />
      </mesh>
      {/* 흙길 */}
      <mesh rotation-x={-Math.PI / 2} position={[-1.5, 0.01, 6]} onClick={moveTo}>
        <planeGeometry args={[3, 8]} />
        <meshStandardMaterial color="#8c7a62" roughness={1} />
      </mesh>
      {/* 물웅덩이 */}
      {[
        [-3.5, 4.5, 1.2],
        [5.5, 8.5, 1.6],
        [-8, 8.5, 1.0],
      ].map(([x, z, s], i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[x, 0.015, z]} scale={[s, s * 0.7, 1]}>
          <circleGeometry args={[0.8, 24]} />
          <meshStandardMaterial color="#8fa7b8" transparent opacity={0.4} roughness={0.1} />
        </mesh>
      ))}
    </group>
  )
}

/* ───────── 돌담 ───────── */
function StoneWall() {
  const stones = useMemo(() => {
    const arr = []
    for (let x = -16; x < 16; x += 0.9)
      for (let r = 0; r < 2; r++)
        arr.push([x + (r % 2) * 0.45 + rnd(-0.1, 0.1), 0.2 + r * 0.38, 11.9, rnd(0.7, 0.95), rnd(0.3, 0.4), rnd(0.5, 0.7), `hsl(40,${rnd(5, 12)}%,${rnd(48, 62)}%)`])
    return arr
  }, [])
  return (
    <group>
      {stones.map((s, i) => (
        <Box key={i} p={[s[0], s[1], s[2]]} s={[s[3], s[4], s[5]]} c={s[6]} />
      ))}
    </group>
  )
}

/* ───────── 감나무 + 장독대 ───────── */
function Tree() {
  const fruits = useMemo(() => Array.from({ length: 12 }, () => [rnd(-1.1, 1.1), rnd(2.0, 3.2), rnd(-1.1, 1.1)]), [])
  return (
    <group position={[-6, 0, 6]}>
      <Cyl p={[0, 0.9, 0]} r={0.2} rb={0.28} h={1.8} c="#5a3d2b" />
      <Cyl p={[0.3, 1.9, 0]} r={0.08} rb={0.12} h={1.0} c="#5a3d2b" rot={[0, 0, -0.7]} />
      <Cyl p={[-0.3, 2.0, 0]} r={0.08} rb={0.12} h={1.0} c="#5a3d2b" rot={[0, 0, 0.7]} />
      <Sph p={[0, 2.8, 0]} r={1.3} sc={[1, 0.75, 1]} c="#b8892f" />
      <Sph p={[-0.8, 2.4, 0.3]} r={0.9} sc={[1, 0.7, 1]} c="#c58a3a" />
      <Sph p={[0.8, 2.5, -0.3]} r={0.9} sc={[1, 0.7, 1]} c="#a97b2c" />
      {fruits.map((p, i) => (
        <Sph key={i} p={p} r={0.09} c="#f08a24" seg={10} />
      ))}
    </group>
  )
}

function Jars() {
  const jars = [
    [8, 4.2, 1],
    [8.9, 4.7, 0.85],
    [7.6, 5.1, 0.7],
    [8.7, 3.6, 0.75],
  ]
  return (
    <group>
      {jars.map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} scale={s}>
          <Sph p={[0, 0.36, 0]} r={0.34} sc={[1, 1.1, 1]} c="#6b4a36" rough={0.5} />
          <Cyl p={[0, 0.75, 0]} r={0.14} rb={0.2} h={0.16} c="#6b4a36" />
          <Cyl p={[0, 0.88, 0]} r={0.2} rb={0.02} h={0.1} c="#5a3d2b" seg={12} />
        </group>
      ))}
    </group>
  )
}

/* ───────── 처마 빗줄기 + 낙수 (클릭: 가랑비 ↔ 장대비) ───────── */
const STRAND_X = [-9.6, -7.6, -5.6, -3.6, -1.6, 0.4, 2.4, 4.4, 6.2]

function EaveRain() {
  const level = useStore((s) => s.rainLevel)
  const drops = useRef([])
  const drips = useMemo(() => Array.from({ length: 22 }, (_, i) => [-10 + i * 0.78 + rnd(-0.2, 0.2), rnd(0, 1)]), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const rate = getState().rainLevel >= 2 ? 1.5 : 0.8
    drops.current.forEach((m, i) => {
      if (!m) return
      const ph = (t * rate + drips[i][1] * 3 + i * 0.37) % 1
      m.position.y = 2.78 * (1 - ph * ph) + 0.03
      m.material.opacity = ph > 0.93 ? 0 : 0.7
    })
  })
  const heavy = level >= 2
  return (
    <group>
      {STRAND_X.map((x) => (
        <group
          key={x}
          position={[x, 0, 2.5]}
          {...interact('☔ 빗줄기 — 클릭해서 가랑비 ↔ 장대비', toggleRain)}
        >
          <Cyl p={[0, 1.42, 0]} r={heavy ? 0.04 : 0.018} h={2.8} c="#cfe6f7" seg={8} opacity={heavy ? 0.55 : 0.35} />
          <HitCyl p={[0, 1.4, 0]} r={0.28} h={2.8} />
        </group>
      ))}
      {drips.map((d, i) => (
        <mesh key={i} ref={(el) => (drops.current[i] = el)} position={[d[0], 2.8, 2.52]} scale={[1, 1.6, 1]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#dff1ff" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/* ───────── 풍경 (유리 종) ───────── */
function WindChime() {
  const g = useRef()
  const a = useRef({ t: 99, amp: 0 })
  useFrame(({ clock }, dt) => {
    const s = a.current
    s.t += dt
    const swing = s.amp * Math.exp(-s.t * 0.9) * Math.sin(s.t * 6)
    const idle = Math.sin(clock.elapsedTime * 1.3) * 0.03
    g.current.rotation.z = swing + idle
    g.current.rotation.x = swing * 0.5
  })
  return (
    <group position={[1.6, 2.8, 1.8]}>
      <group
        ref={g}
        {...interact('🔔 처마 끝 풍경 — 딸랑~', () => {
          a.current.t = 0
          a.current.amp = 0.5
          audio.chime()
        })}
      >
        <Cyl p={[0, -0.05, 0]} r={0.008} h={0.1} c="#999" />
        <mesh position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.04, 0.12, 0.16, 16, 1, true]} />
          <meshStandardMaterial color="#b8ecf0" transparent opacity={0.6} roughness={0.05} side={2} emissive="#7fd8e0" emissiveIntensity={0.25} />
        </mesh>
        <Sph p={[0, -0.28, 0]} r={0.025} c="#d6b36a" seg={8} />
        <Cyl p={[0, -0.45, 0]} r={0.004} h={0.3} c="#d8d2c4" seg={6} />
        <Box p={[0, -0.65, 0]} s={[0.12, 0.012, 0.07]} c="#8fe0d8" opacity={0.85} />
        <HitCyl p={[0, -0.35, 0]} r={0.25} h={0.9} />
      </group>
    </group>
  )
}

/* ───────── 낙엽 더미 + 다람쥐 ───────── */
function LeafPile() {
  const leaves = useMemo(() => {
    const pal = ['#c9622b', '#d98a2b', '#b8452a', '#e0b03a', '#8a5a2b']
    return Array.from({ length: 46 }, () => {
      const ang = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * 1.15
      return {
        p: [Math.cos(ang) * r, 0.05 + (1.15 - r) * 0.22 + Math.random() * 0.04, Math.sin(ang) * r],
        rot: [rnd(-0.3, 0.3), rnd(0, 6.28), rnd(-0.3, 0.3)],
        c: pal[(Math.random() * pal.length) | 0],
        ph: Math.random() * 6,
      }
    })
  }, [])
  const refs = useRef([])
  const sq = useRef()
  const head = useRef()
  const acorn = useRef()
  const a = useRef({ t: 99 })

  const dig = () => {
    if (a.current.t < 3) return
    a.current.t = 0
    audio.leaves(3)
  }

  useFrame(({ clock }, dt) => {
    const s = a.current
    s.t += dt
    const on = s.t < 3
    const t = clock.elapsedTime
    refs.current.forEach((m, i) => {
      if (!m) return
      const L = leaves[i]
      const hop = on ? Math.max(0, Math.sin(s.t * 14 + L.ph)) * 0.08 * (1 - s.t / 3) : 0
      m.position.y = L.p[1] + hop
      m.rotation.y = L.rot[1] + (on ? Math.sin(s.t * 8 + L.ph) * 0.3 : 0)
    })
    head.current.rotation.x = on ? 0.4 + Math.sin(s.t * 16) * 0.35 : Math.sin(t * 1.5) * 0.05
    sq.current.position.y = 0.45 + (on ? Math.abs(Math.sin(s.t * 8)) * 0.03 : 0)
    acorn.current.visible = on ? s.t > 0.6 : true
    acorn.current.rotation.z = on ? Math.sin(s.t * 20) * 0.2 : 0
  })

  return (
    <group position={[3.4, 0, 5]} {...interact('🐿️ 낙엽 더미 — 다람쥐가 도토리를 까먹어요', dig)}>
      {leaves.map((L, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} position={L.p} rotation={L.rot}>
          <boxGeometry args={[0.26, 0.012, 0.17]} />
          <meshStandardMaterial color={L.c} roughness={1} />
        </mesh>
      ))}
      <HitCyl p={[0, 0.3, 0]} r={1.3} h={0.6} />
      {/* 다람쥐 */}
      <group ref={sq} position={[0, 0.45, 0]} rotation={[0, -0.6, 0]}>
        <Sph p={[0, 0.12, 0]} r={0.17} sc={[1, 0.95, 1.2]} c="#a85f2d" />
        <Sph p={[0, 0.1, 0.1]} r={0.12} sc={[0.9, 0.9, 0.7]} c="#f1d9b8" />
        <group ref={head} position={[0, 0.3, 0.16]}>
          <Sph p={[0, 0, 0]} r={0.12} c="#b86c34" />
          <Sph p={[0, -0.04, 0.09]} r={0.07} sc={[1, 0.8, 0.8]} c="#f1d9b8" />
          <Sph p={[-0.05, 0.03, 0.1]} r={0.018} c="#222" seg={8} />
          <Sph p={[0.05, 0.03, 0.1]} r={0.018} c="#222" seg={8} />
          <Sph p={[0, -0.01, 0.14]} r={0.014} c="#3a2a28" seg={8} />
          <mesh position={[-0.07, 0.12, 0]} rotation={[0, 0, 0.3]}>
            <coneGeometry args={[0.04, 0.09, 6]} />
            <meshStandardMaterial color="#a85f2d" roughness={1} />
          </mesh>
          <mesh position={[0.07, 0.12, 0]} rotation={[0, 0, -0.3]}>
            <coneGeometry args={[0.04, 0.09, 6]} />
            <meshStandardMaterial color="#a85f2d" roughness={1} />
          </mesh>
        </group>
        {/* 도토리 */}
        <group ref={acorn} position={[0, 0.22, 0.3]}>
          <Sph p={[0, 0, 0]} r={0.04} sc={[1, 1.2, 1]} c="#8a5a2b" seg={10} />
          <Sph p={[0, 0.04, 0]} r={0.042} sc={[1, 0.6, 1]} c="#5a3d2b" seg={10} />
        </group>
        {/* 꼬리 */}
        <Sph p={[0, 0.2, -0.28]} r={0.15} sc={[0.8, 1.3, 0.8]} c="#c27a3b" />
        <Sph p={[0, 0.4, -0.3]} r={0.14} sc={[0.8, 1.2, 0.8]} c="#b86c34" />
        <Sph p={[0, 0.58, -0.22]} r={0.11} sc={[0.8, 1.0, 0.8]} c="#c27a3b" />
      </group>
    </group>
  )
}

export default function YardZone() {
  return (
    <group>
      <Ground />
      <StoneWall />
      <Tree />
      <Jars />
      <EaveRain />
      <WindChime />
      <LeafPile />
    </group>
  )
}
