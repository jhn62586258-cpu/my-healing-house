import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { world, interact, useStore, setState, showToast, FLOOR, MOM_LINES } from '../store'
import * as audio from '../audio/AsmrEngine'
import { Box, Cyl, Sph, roundCylGeo } from './parts'
import { Mom } from './Character'
import { SpeechBubble, Steam, Sparkle } from './Fx'

const F = FLOOR
const TOPY = F + 0.86

/* ───────── 조리대 · 싱크대 · 가스레인지 ───────── */
function Counter() {
  return (
    <group>
      <Box p={[4.05, F + 0.42, -6.6]} s={[3.9, 0.84, 0.75]} c="#e9e2cf" r={0.7} />
      {[2.6, 3.4, 4.2, 5.0, 5.7].map((x) => (
        <Box key={x} p={[x, F + 0.42, -6.22]} s={[0.7, 0.72, 0.02]} c="#a8cfc0" r={0.6} />
      ))}
      <Box p={[4.05, TOPY, -6.6]} s={[3.95, 0.04, 0.8]} c="#cfc6b6" r={0.4} />
      {/* 싱크대 */}
      <Box p={[2.85, TOPY + 0.005, -6.6]} s={[0.7, 0.03, 0.5]} c="#b8bcc0" m={0.6} r={0.25} />
      <Cyl p={[2.85, TOPY + 0.2, -6.9]} r={0.02} h={0.38} c="#c9cdd0" />
      {/* 가스레인지 */}
      <Box p={[4.75, TOPY + 0.04, -6.6]} s={[0.95, 0.06, 0.6]} c="#8a8590" r={0.5} />
      {[4.45, 5.05].map((x) => (
        <group key={x} position={[x, TOPY + 0.08, -6.55]}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.07, 0.11, 20]} />
            <meshStandardMaterial color="#b9b4bd" />
          </mesh>
        </group>
      ))}
      {/* 상부장 + 환풍기 */}
      <Box p={[3.4, 2.4, -6.78]} s={[2.4, 0.7, 0.4]} c="#f2ecdc" r={0.7} />
      <Box p={[4.75, 2.3, -6.75]} s={[0.9, 0.3, 0.5]} c="#c9c9c9" m={0.4} r={0.4} />
      {/* 냉장고 */}
      <Box p={[5.65, F + 0.9, -5.0]} s={[0.65, 1.8, 0.75]} c="#e8efe9" r={0.4} />
      <Box p={[5.32, F + 1.2, -5.0]} s={[0.02, 0.4, 0.04]} c="#9aa" />
      {/* 밥상 + 반찬 */}
      <Cyl p={[4.0, F + 0.33, -2.4]} r={0.62} h={0.05} c="#a0602e" seg={28} />
      {[0, 1, 2, 3].map((i) => (
        <Box key={i} p={[4.0 + Math.cos(i * 1.57 + 0.78) * 0.4, F + 0.15, -2.4 + Math.sin(i * 1.57 + 0.78) * 0.4]} s={[0.05, 0.3, 0.05]} c="#7a4a24" />
      ))}
      <Cyl p={[3.8, F + 0.4, -2.35]} r={0.08} rb={0.06} h={0.08} c="#f5f3ee" />
      <Sph p={[3.8, F + 0.44, -2.35]} r={0.07} sc={[1, 0.5, 1]} c="#ffffff" />
      <Cyl p={[4.15, F + 0.4, -2.25]} r={0.09} rb={0.07} h={0.08} c="#7a3e2a" />
      {[
        [4.2, -2.62, '#5c9a3a'],
        [3.85, -2.65, '#c0392b'],
        [4.4, -2.4, '#e7c66b'],
      ].map(([x, z, c], i) => (
        <group key={i}>
          <Cyl p={[x, F + 0.38, z]} r={0.07} rb={0.05} h={0.04} c="#f0ece2" />
          <Sph p={[x, F + 0.405, z]} r={0.05} sc={[1, 0.35, 1]} c={c} />
        </group>
      ))}
      <Box p={[3.2, F + 0.03, -2.4]} s={[0.5, 0.06, 0.5]} c="#c25b53" r={1} />
      <pointLight position={[4, 2.6, -3.5]} color="#ffe2b0" intensity={3.5} distance={7} decay={1.6} />
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
    surf.current.position.y = 0.14 + (on ? Math.sin(t * 9) * 0.005 : 0)
  })
  const pos = [4.75, TOPY + 0.1, -6.55]
  const act = () => {
    const next = !on
    setState({ stewOn: next })
    audio.setAmbient('stew', next)
    showToast(next ? '🍲 된장찌개가 보글보글 끓어요' : '🍲 불을 줄였어요')
  }
  return (
    <group>
      <group position={[5.05, TOPY + 0.08, -6.55]}>
        <group ref={flame}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} position={[Math.cos(i) * 0.08, 0.03, Math.sin(i) * 0.08]}>
              <coneGeometry args={[0.02, 0.06, 6]} />
              <meshStandardMaterial color="#5aa0ff" emissive="#3a7bff" emissiveIntensity={2} transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
      </group>
      <group position={[5.05, TOPY + 0.1, -6.55]} {...interact('🍲 된장찌개 뚝배기 (터치: 보글보글 ON/OFF)', act, pos, 2.3)}>
        <mesh>
          <primitive object={roundCylGeo(0.16, 0.12, 0.16, 24, 0.04)} attach="geometry" />
          <meshStandardMaterial color="#8a6a5a" roughness={0.6} />
        </mesh>
        <mesh ref={surf} position={[0, 0.14, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.145, 20]} />
          <meshStandardMaterial color="#d79a62" roughness={0.4} />
        </mesh>
        {[
          [0.05, 0.03],
          [-0.04, -0.05],
          [-0.06, 0.05],
        ].map(([x, z], i) => (
          <Box key={i} p={[x, 0.15, z]} s={[0.04, 0.03, 0.04]} c="#fbf6e8" />
        ))}
        <Sph p={[0.03, 0.15, -0.06]} r={0.02} c="#3f7a2e" />
        <Steam on={on} p={[0, 0.18, 0]} spread={0.07} rise={0.8} />
      </group>
      <Sparkle p={[5.05, TOPY + 0.6, -6.55]} />
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
  const base = [4.6, F, -5.82]
  const say = () => {
    let s = MOM_LINES[Math.floor(Math.random() * MOM_LINES.length)]
    if (s === last.current) s = MOM_LINES[(MOM_LINES.indexOf(s) + 1) % MOM_LINES.length]
    last.current = s
    bubble.current.say(s)
    talk.current = 3.5
  }
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
    // 국자 젓기
    arm.current.rotation.x = -0.9 + (talk.current > 0 ? Math.sin(t * 8) * 0.25 - 0.6 : Math.sin(t * 3) * 0.12)
    arm.current.rotation.y = talk.current > 0 ? 0 : Math.cos(t * 3) * 0.25
    head.current.rotation.z = Math.sin(t * 1.4) * 0.06
    head.current.position.y = 1.62 + Math.sin(t * 2) * 0.005
  })
  return (
    <group ref={g} position={base} rotation={[0, Math.PI, 0]} {...interact('👩 부엌의 뽀글머리 엄마', say, base, 2.5)}>
      <Mom armRef={arm} headRef={head} />
      <SpeechBubble ref={bubble} y={2.15} />
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
