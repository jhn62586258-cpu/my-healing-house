import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { world, getState, interact, toggleMixer, showToast } from '../store'
import * as audio from '../audio/AsmrEngine'
import { plaid } from './textures'
import { Box, Cyl, Sph, Hit, HitCyl } from './parts'

const F = 0.15

/* ───────── 백열등 + 조명 ───────── */
function Pendant() {
  return (
    <group>
      <Cyl p={[0.6, 2.8, -2.8]} r={0.008} h={0.4} c="#333" />
      <Sph p={[0.6, 2.55, -2.8]} r={0.15} c="#ffe6b0" emissive="#ffc766" ei={2} />
      <pointLight position={[0.6, 2.4, -2.8]} color="#ffcf80" intensity={18} distance={10} decay={2} />
    </group>
  )
}

/* ───────── 밥상 ───────── */
function Soban() {
  return (
    <group position={[1.2, F, -2.7]}>
      <Cyl p={[0, 0.45, 0]} r={0.55} h={0.05} c="#8d5a34" seg={28} />
      {[
        [-0.35, -0.35],
        [0.35, -0.35],
        [-0.35, 0.35],
        [0.35, 0.35],
      ].map(([x, z], i) => (
        <Cyl key={i} p={[x, 0.22, z]} r={0.035} h={0.44} c="#6b4426" />
      ))}
      <Cyl p={[-0.2, 0.52, 0.05]} r={0.1} rb={0.07} h={0.09} c="#f7f4ee" />
      <Cyl p={[-0.2, 0.565, 0.05]} r={0.085} h={0.02} c="#ffffff" />
      <Cyl p={[0.12, 0.52, -0.15]} r={0.1} rb={0.07} h={0.09} c="#e9eef5" />
      <Cyl p={[0.12, 0.565, -0.15]} r={0.085} h={0.02} c="#a56a3a" />
      <Cyl p={[0.2, 0.485, 0.22]} r={0.14} h={0.02} c="#f3efe6" />
      <Sph p={[0.16, 0.51, 0.22]} r={0.045} c="#e2574c" />
      <Sph p={[0.24, 0.51, 0.2]} r={0.04} c="#7fb069" />
      <Sph p={[0.2, 0.51, 0.27]} r={0.04} c="#f0c04a" />
    </group>
  )
}

/* ───────── 무릎 쿠션 + 솜털 귀이개 ───────── */
function EarPick() {
  const g = useRef()
  const a = useRef({ t: 99 })
  const last = useRef(0)
  const go = () => {
    const now = performance.now()
    if (now - last.current < 2600) return
    last.current = now
    a.current.t = 0
    audio.earPick(2.6)
  }
  useFrame((_, dt) => {
    const s = a.current
    s.t += dt
    const amp = s.t < 2.6 ? Math.sin((s.t / 2.6) * Math.PI) : 0
    g.current.rotation.z = 0.35 + Math.sin(s.t * 9) * 0.12 * amp
    g.current.rotation.y = Math.sin(s.t * 5) * 0.3 * amp
    g.current.position.y = 0.12 + amp * 0.06 + Math.sin(s.t * 12) * 0.01 * amp
  })
  const fluff = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const ang = (i / 7) * Math.PI * 2
        return [-0.2 + Math.cos(ang) * 0.015, Math.sin(ang) * 0.045, Math.cos(ang * 1.7) * 0.045]
      }),
    []
  )
  return (
    <group position={[-1.8, F + 0.14, -2.4]}>
      <group
        ref={g}
        position={[0, 0.12, 0]}
        {...interact('🪶 솜털 귀이개 — 클릭하거나 흔들어봐요', go)}
        onPointerMove={(e) => {
          if (e.buttons === 1 && world.dragLock) go()
        }}
      >
        <Cyl p={[0, 0, 0]} r={0.012} h={0.4} c="#d7b26b" rot={[0, 0, Math.PI / 2]} />
        <Sph p={[-0.2, 0, 0]} r={0.055} c="#fffdf8" rough={1} />
        {fluff.map((p, i) => (
          <Sph key={i} p={p} r={0.03} c="#ffffff" rough={1} seg={8} />
        ))}
        <Sph p={[0.2, 0, 0]} r={0.016} c="#c79a4a" seg={8} />
        <Hit p={[0, 0, 0]} s={[0.5, 0.2, 0.2]} />
      </group>
    </group>
  )
}

function KneeCushion() {
  const tex = useMemo(() => plaid('#f6d98b', '#fff3cc', '#e7b95a', [2, 2]), [])
  return (
    <group>
      <mesh position={[-1.8, F + 0.07, -2.4]}>
        <cylinderGeometry args={[0.55, 0.55, 0.14, 32]} />
        <meshStandardMaterial map={tex} roughness={1} />
      </mesh>
      <mesh position={[-0.6, F + 0.06, -1.5]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.7, 0.12, 0.7]} />
        <meshStandardMaterial color="#f2b8c6" roughness={1} />
      </mesh>
      <EarPick />
    </group>
  )
}

/* ───────── 열린 부엌 + 뚝배기 ───────── */
function Pot() {
  const lid = useRef()
  const steam = useRef([])
  const flames = useRef([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const on = getState().mixer.stew.on
    lid.current.position.y = 0.24 + (on ? Math.abs(Math.sin(t * 9)) * 0.025 : 0)
    lid.current.rotation.z = on ? Math.sin(t * 11) * 0.05 : 0
    steam.current.forEach((m, i) => {
      if (!m) return
      const ph = (t * 0.35 + i / 7) % 1
      m.position.set(Math.sin(t + i) * 0.06 + (i % 2 ? 0.05 : -0.05), 0.3 + ph * 1.1, Math.cos(t * 0.8 + i) * 0.05)
      m.scale.setScalar(on ? 0.07 + ph * 0.16 : 0.0001)
      m.material.opacity = on ? (1 - ph) * 0.35 : 0
    })
    flames.current.forEach((m, i) => {
      if (!m) return
      m.scale.setScalar(on ? 0.8 + Math.sin(t * 14 + i * 2) * 0.3 : 0.0001)
    })
  })
  return (
    <group
      position={[4.1, F + 0.95 + 0.12, -5.3]}
      {...interact('🍲 보글보글 된장찌개 — 클릭해서 ON/OFF', () => {
        toggleMixer('stew')
        showToast(getState().mixer.stew.on ? '🍲 찌개가 보글보글 끓어요' : '🔥 불을 약하게 줄였어요')
      })}
    >
      {/* 불꽃 */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} ref={(el) => (flames.current[i] = el)} position={[Math.cos(a) * 0.13, -0.02, Math.sin(a) * 0.13]}>
            <coneGeometry args={[0.025, 0.07, 6]} />
            <meshStandardMaterial color="#4aa3ff" emissive="#4aa3ff" emissiveIntensity={1.6} transparent opacity={0.85} />
          </mesh>
        )
      })}
      <Cyl p={[0, 0.11, 0]} r={0.24} rb={0.2} h={0.22} c="#4a2f23" seg={24} />
      <Cyl p={[0, 0.2, 0]} r={0.255} h={0.025} c="#3a241a" seg={24} />
      <Box p={[0.26, 0.17, 0]} s={[0.1, 0.03, 0.05]} c="#3a241a" />
      <Box p={[-0.26, 0.17, 0]} s={[0.1, 0.03, 0.05]} c="#3a241a" />
      <group ref={lid} position={[0, 0.24, 0]}>
        <Cyl p={[0, 0, 0]} r={0.245} rb={0.25} h={0.05} c="#5a3a2c" seg={24} />
        <Sph p={[0, 0.05, 0]} r={0.035} c="#3a241a" seg={10} />
      </group>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} ref={(el) => (steam.current[i] = el)} position={[0, 0.3, 0]} scale={0.0001}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0} depthWrite={false} roughness={1} />
        </mesh>
      ))}
      <Hit p={[0, 0.2, 0]} s={[0.7, 0.5, 0.7]} />
    </group>
  )
}

function Kitchen() {
  return (
    <group>
      <Box p={[4.3, F + 0.475, -5.32]} s={[3.0, 0.95, 1.1]} c="#c9a47a" />
      <Box p={[4.3, F + 0.96, -5.32]} s={[3.05, 0.04, 1.15]} c="#6b5b4c" />
      <Box p={[4.3, 2.0, -5.9]} s={[3.0, 1.6, 0.06]} c="#f4f1ea" />
      {/* 가스레인지 */}
      <Box p={[4.1, F + 1.0, -5.3]} s={[0.9, 0.08, 0.6]} c="#2b2b2f" m={0.5} r={0.4} />
      <Box p={[3.2, F + 1.0, -5.3]} s={[0.5, 0.06, 0.4]} c="#8aa09a" />
      {/* 선반 위 항아리들 */}
      <Cyl p={[3.1, 2.4, -5.8]} r={0.12} h={0.3} c="#8a5a34" />
      <Cyl p={[3.5, 2.4, -5.8]} r={0.1} h={0.25} c="#c58a3a" />
      <Box p={[4.3, 2.22, -5.75]} s={[2.4, 0.04, 0.3]} c="#8a5a34" />
      <Cyl p={[3.1, 2.4, -5.8]} r={0.12} h={0.3} c="#8a5a34" />
      <Pot />
      <pointLight position={[4.3, 2.6, -4.6]} color="#ffd9a0" intensity={6} distance={6} decay={2} />
    </group>
  )
}

export default function LivingZone() {
  return (
    <group>
      <Pendant />
      <Soban />
      <KneeCushion />
      <Kitchen />
    </group>
  )
}
