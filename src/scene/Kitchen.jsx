import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { world, useActor, useStore, showToast, playAmbient, FLOOR, MOM_LINES } from '../store'
import { Box, Cyl, Sph, roundCylGeo } from './parts'
import { Mom } from './Character'
import { SpeechBubble, Steam, SoundBadge } from './Fx'
import { pick } from './Living'

const F = FLOOR
const TOPY = F + 0.86
const CAB = '#7a5132'

/* ───────── 냉장고 · 조리대 · 수납장 · 식탁 ───────── */
function Counter() {
  return (
    <group>
      {/* 냉장고 */}
      <Box p={[2.0, F + 0.88, -5.58]} s={[0.78, 1.76, 0.72]} c="#f1f0ec" r={0.35} rad={0.06} />
      <Box p={[2.0, F + 1.22, -5.215]} s={[0.74, 0.012, 0.01]} c="#cfcac2" />
      <Box p={[1.67, F + 1.45, -5.2]} s={[0.03, 0.3, 0.04]} c="#bdb8ae" />
      <Box p={[1.67, F + 0.75, -5.2]} s={[0.03, 0.3, 0.04]} c="#bdb8ae" />
      {[
        [2.1, 1.55, '#e7b04a'],
        [2.25, 1.4, '#7fa6c9'],
        [1.95, 1.3, '#d9725c'],
      ].map(([x, y, c], i) => (
        <Box key={i} p={[x, F + y, -5.215]} s={[0.1, 0.08, 0.015]} c={c} />
      ))}
      {/* 북쪽 조리대 */}
      <Box p={[3.87, F + 0.42, -5.68]} s={[2.62, 0.84, 0.64]} c={CAB} r={0.6} />
      {[2.9, 3.55, 4.2, 4.85].map((x) => (
        <group key={x}>
          <Box p={[x, F + 0.42, -5.355]} s={[0.6, 0.7, 0.02]} c="#8a5c39" r={0.55} />
          <Box p={[x + 0.22, F + 0.6, -5.34]} s={[0.03, 0.12, 0.02]} c="#c9b28a" m={0.4} />
        </group>
      ))}
      <Box p={[3.87, TOPY, -5.68]} s={[2.66, 0.04, 0.68]} c="#d8d2c6" r={0.35} />
      {/* 옆 조리대 */}
      <Box p={[4.88, F + 0.42, -3.9]} s={[0.62, 0.84, 2.8]} c={CAB} r={0.6} />
      <Box p={[4.88, TOPY, -3.9]} s={[0.66, 0.04, 2.8]} c="#d8d2c6" r={0.35} />
      {[
        [4.88, -3.0, '#d6c8a8', 0.09],
        [4.95, -3.3, '#b07a4a', 0.07],
        [4.85, -4.6, '#e8e2d4', 0.12],
      ].map(([x, z, c, r], i) => (
        <Cyl key={i} p={[x, TOPY + 0.1, z]} r={r} h={0.2} c={c} />
      ))}
      {/* 싱크 + 수전 */}
      <Box p={[3.0, TOPY + 0.005, -5.65]} s={[0.66, 0.03, 0.46]} c="#b8bcc0" m={0.6} r={0.25} />
      <Cyl p={[3.0, TOPY + 0.17, -5.92]} r={0.02} h={0.32} c="#c9cdd0" />
      {/* 가스레인지 */}
      <Box p={[4.05, TOPY + 0.04, -5.65]} s={[0.9, 0.06, 0.56]} c="#2e2d2c" r={0.4} />
      {[3.82, 4.27].map((x) => (
        <mesh key={x} position={[x, TOPY + 0.075, -5.65]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.07, 0.11, 20]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      ))}
      {/* 후드 + 상부장 + 선반 */}
      <Box p={[4.05, 2.35, -5.75]} s={[0.9, 0.28, 0.5]} c="#bfbdb8" m={0.4} r={0.4} />
      <Box p={[4.7, 2.45, -5.75]} s={[0.9, 0.7, 0.4]} c={CAB} r={0.6} />
      <Box p={[3.0, 2.15, -5.78]} s={[0.9, 0.04, 0.3]} c="#7a5132" />
      <Box p={[3.0, 2.55, -5.78]} s={[0.9, 0.04, 0.3]} c="#7a5132" />
      {[2.7, 2.9, 3.1, 3.3].map((x, i) => (
        <Cyl key={x} p={[x, 2.25, -5.78]} r={0.06} h={0.16} c={['#d9c08a', '#c97a4a', '#e8e2d4', '#a8865a'][i]} />
      ))}
      {[2.75, 3.0, 3.25].map((x) => (
        <Cyl key={x} p={[x, 2.63, -5.78]} r={0.08} rb={0.05} h={0.1} c="#efe9de" />
      ))}
      {/* 식탁 + 의자 4 + 감 바구니 */}
      <Box p={[3.0, F + 0.72, 0.1]} s={[1.7, 0.07, 1.0]} c="#7a4e2e" r={0.45} rad={0.03} />
      {[
        [-0.75, -0.42],
        [0.75, -0.42],
        [-0.75, 0.42],
        [0.75, 0.42],
      ].map(([x, z], i) => (
        <Box key={i} p={[3.0 + x, F + 0.36, 0.1 + z]} s={[0.07, 0.72, 0.07]} c="#5a3a24" />
      ))}
      {[
        [2.55, -0.65, 0],
        [3.45, -0.65, 0],
        [2.55, 0.85, Math.PI],
        [3.45, 0.85, Math.PI],
      ].map(([x, z, r], i) => (
        <group key={i} position={[x, F, z]} rotation-y={r}>
          <Box p={[0, 0.45, 0]} s={[0.44, 0.05, 0.42]} c="#7a4e2e" rad={0.02} />
          <Box p={[0, 0.78, -0.2]} s={[0.44, 0.5, 0.04]} c="#7a4e2e" rad={0.02} />
          {[
            [-0.18, -0.17],
            [0.18, -0.17],
            [-0.18, 0.17],
            [0.18, 0.17],
          ].map(([a, b], k) => (
            <Box key={k} p={[a, 0.22, b]} s={[0.04, 0.44, 0.04]} c="#5a3a24" />
          ))}
        </group>
      ))}
      <mesh position={[3.15, F + 0.82, 0.05]} geometry={roundCylGeo(0.26, 0.16, 0.14, 28, 0.03)}>
        <meshStandardMaterial color="#8a5a34" roughness={0.6} />
      </mesh>
      {[
        [0, 0.95, 0],
        [0.12, 0.93, 0.07],
        [-0.12, 0.93, 0.05],
        [0.03, 0.93, -0.12],
        [-0.06, 1.04, -0.02],
        [0.08, 1.03, -0.04],
      ].map(([x, y, z], i) => (
        <Sph key={i} p={[3.15 + x, F + y, 0.05 + z]} r={0.07} sc={[1, 0.86, 1]} c="#e8752a" rough={0.45} />
      ))}
      {/* 부엌 펜던트 등 */}
      <Cyl p={[3.4, 2.85, -3.6]} r={0.006} h={0.45} c="#3a2a1a" />
      <mesh position={[3.4, 2.55, -3.6]} geometry={roundCylGeo(0.07, 0.17, 0.18, 24, 0.02)}>
        <meshStandardMaterial color="#f2e6cc" emissive="#ffd59a" emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
      <pointLight position={[3.4, 2.4, -3.6]} color="#ffd59a" intensity={2.4} distance={6} decay={1.7} />
      <pointLight position={[3.0, 2.4, 0.2]} color="#ffe2b8" intensity={1.6} distance={5} decay={1.7} />
      <pointLight position={[3.4, 2.5, -2.0]} color="#ffe8cc" intensity={1.4} distance={6} decay={1.7} />
    </group>
  )
}

/* ───────── 된장찌개 뚝배기 ───────── */
function Ttukbaegi() {
  const on = useStore((s) => s.stewOn)
  const flame = useRef()
  const surf = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    flame.current.visible = on
    flame.current.scale.y = 1 + Math.sin(t * 20) * 0.15
    surf.current.position.y = 0.14 + (on ? Math.sin(t * 9) * 0.006 : 0)
  })
  const pos = [4.27, TOPY + 0.1, -5.65]
  const h = useActor('stew', 'object', '🍲 된장찌개 뚝배기 (보글보글)', pos, () => {
    playAmbient('stew', 'stew', 6500, 'stewOn')
    showToast('🍲 된장찌개가 보글보글 끓어요')
  })
  return (
    <group>
      <group ref={flame} position={[4.27, TOPY + 0.09, -5.65]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[Math.cos(i) * 0.08, 0.02, Math.sin(i) * 0.08]}>
            <coneGeometry args={[0.018, 0.05, 6]} />
            <meshStandardMaterial color="#5aa0ff" emissive="#3a7bff" emissiveIntensity={2} toneMapped={false} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
      <group position={pos} {...h}>
        <mesh geometry={roundCylGeo(0.17, 0.12, 0.16, 28, 0.04)}>
          <meshStandardMaterial color="#2d211b" roughness={0.45} />
        </mesh>
        <mesh ref={surf} position={[0, 0.14, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.15, 24]} />
          <meshStandardMaterial color="#a8622a" roughness={0.3} />
        </mesh>
        {[
          [0.05, 0.03],
          [-0.04, -0.05],
          [-0.06, 0.05],
        ].map(([x, z], i) => (
          <Box key={i} p={[x, 0.15, z]} s={[0.04, 0.03, 0.04]} c="#fbf6e8" />
        ))}
        <Sph p={[0.03, 0.15, -0.06]} r={0.02} c="#4f7a2e" />
        <Steam on={on} p={[0, 0.18, 0]} spread={0.07} rise={0.85} />
        <SoundBadge id="stew" p={[0, 0.62, 0.15]} />
      </group>
    </group>
  )
}

/* ───────── 뽀글머리 엄마 ───────── */
function MomAtStove() {
  const g = useRef()
  const arm = useRef()
  const head = useRef()
  const bubble = useRef()
  const talk = useRef(0)
  const last = useRef('')
  const base = [3.95, F, -4.9]
  const say = () => {
    last.current = pick(MOM_LINES, last.current)
    bubble.current.say(last.current)
    talk.current = 3.5
  }
  const h = useActor('mom', 'talk', '👩 부엌의 뽀글머리 엄마', base, say, 2.6)
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    talk.current = Math.max(0, talk.current - dt)
    const p = world.player
    const face = Math.atan2(p.x - base[0], p.z - base[2])
    const want = talk.current > 0 ? face : Math.PI
    let d = want - g.current.rotation.y
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    g.current.rotation.y += d * Math.min(1, dt * 5)
    arm.current.rotation.x = -0.9 + (talk.current > 0 ? Math.sin(t * 8) * 0.25 - 0.5 : Math.sin(t * 3) * 0.12)
    arm.current.rotation.y = talk.current > 0 ? 0 : Math.cos(t * 3) * 0.25
    head.current.rotation.z = Math.sin(t * 1.4) * 0.05
  })
  return (
    <group ref={g} position={base} rotation={[0, Math.PI, 0]} {...h}>
      <Mom armRef={arm} headRef={head} />
      <SpeechBubble ref={bubble} y={1.65} />
    </group>
  )
}

export default function Kitchen() {
  return (
    <group>
      <Counter />
      <Ttukbaegi />
      <MomAtStove />
    </group>
  )
}
