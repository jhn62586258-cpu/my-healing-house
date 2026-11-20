import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world, useActor, nearDesk, playSound, FLOOR } from '../store'
import * as audio from '../audio/AsmrEngine'
import { plaid } from './textures'
import { Box, Sph, roundBoxGeo } from './parts'
import { setFade } from './House'
import { SoundBadge } from './Fx'

const F = FLOOR
const DESK_Y = F + 1.42
const IX = 8.15 // 아지트 바닥 물건 x
const SND = { dur: 6000, fade: 2200 }

/* ───────── 책상 + 늘어뜨린 담요 (아지트) ───────── */
function DeskFort() {
  const topMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a5c39', roughness: 0.6 }), [])
  const mon = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1b1b1d', roughness: 0.4 }), [])
  const bl = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ map: plaid('#8c3b34', '#efe4cf', '#3a2420', [2, 2]), roughness: 1, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: plaid('#3f5a7a', '#e9e4d8', '#22324a', [2, 2]), roughness: 1, side: THREE.DoubleSide }),
    ],
    []
  )
  useFrame((_, dt) => {
    const p = world.player
    const fx = world.fx
    fx.desk += ((nearDesk(p.x, p.z) ? 0.12 : 1) - fx.desk) * Math.min(1, dt * 5)
    setFade(topMat, fx.desk)
    setFade(mon, fx.desk)
    bl.forEach((m) => setFade(m, Math.max(0.3, fx.desk)))
  })
  return (
    <group>
      <mesh position={[8.22, DESK_Y, -0.8]} material={topMat} geometry={roundBoxGeo(1.45, 0.08, 3.75, 0.03)} raycast={() => null} />
      <mesh position={[8.82, DESK_Y + 0.32, -0.9]} material={mon} geometry={roundBoxGeo(0.05, 0.55, 0.95, 0.02)} raycast={() => null} />
      <mesh position={[8.22, F + 0.7, -2.62]} material={bl[0]} geometry={roundBoxGeo(1.45, 1.42, 0.05, 0.02)} raycast={() => null} />
      <mesh position={[8.22, F + 0.7, 1.05]} material={bl[1]} geometry={roundBoxGeo(1.45, 1.42, 0.05, 0.02)} raycast={() => null} />
      {/* 아지트 바닥 요 + 쿠션 */}
      <Box p={[8.2, F + 0.03, -0.8]} s={[1.3, 0.06, 3.5]} c="#efe6d4" r={1} rad={0.03} />
      <Sph p={[8.75, F + 0.18, -2.25]} r={0.22} sc={[0.6, 1, 1]} c="#b7a6d4" rough={1} />
      <Sph p={[8.75, F + 0.18, 0.65]} r={0.22} sc={[0.6, 1, 1]} c="#a9cbb5" rough={1} />
      <FairyLights />
    </group>
  )
}

function FairyLights() {
  const bulbs = useRef([])
  const items = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const u = i / 11
        return [7.55, DESK_Y - 0.08 - Math.sin(u * Math.PI) * 0.12, -2.5 + u * 3.4]
      }),
    []
  )
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    bulbs.current.forEach((m, i) => m && (m.material.emissiveIntensity = 1.2 + (0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.3)) * 1.5))
  })
  return (
    <group>
      {items.map((p, i) => (
        <mesh key={i} ref={(el) => (bulbs.current[i] = el)} position={p}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#ffe8a0" emissive="#ffc94a" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[8.0, F + 0.9, -0.8]} color="#ffcf70" intensity={2.4} distance={3.5} decay={2} />
    </group>
  )
}

/* ───────── 무한 뽁뽁이 ───────── */
const bubbleGeo = new THREE.SphereGeometry(0.06, 14, 10)
bubbleGeo.translate(0, 0.06, 0)
function Bubble({ x, z, popped }) {
  const m = useRef()
  useFrame((_, dt) => {
    const s = m.current.scale
    const k = Math.min(1, dt * 18)
    s.y += ((popped ? 0.12 : 0.8) - s.y) * k
    s.x += ((popped ? 1.12 : 1) - s.x) * k
    s.z = s.x
  })
  return (
    <mesh ref={m} geometry={bubbleGeo} position={[x, F + 0.065, z]} scale={[1, 0.8, 1]}>
      <meshStandardMaterial color={popped ? '#cfe3f0' : '#e6f4ff'} transparent opacity={popped ? 0.5 : 0.75} roughness={0.15} />
    </mesh>
  )
}
function BubbleWrap() {
  const popped = useRef(Array(20).fill(false))
  const [, force] = useState(0)
  const popOne = () => {
    const left = popped.current.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0)
    if (!left.length) popped.current = Array(20).fill(false)
    const pool = left.length ? left : [...Array(20).keys()]
    popped.current[pool[Math.floor(Math.random() * pool.length)]] = true
    audio.pop()
    force((n) => n + 1)
  }
  const pos = [IX, F, -1.9]
  const h = useActor('wrap', 'object', '🫧 무한 뽁뽁이 (톡톡)', pos, () => playSound('wrap', popOne, { ...SND, gap: [260, 520] }), 2.2)
  const cells = []
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) cells.push([IX - 0.24 + c * 0.15, -2.2 + r * 0.15, r * 4 + c])
  return (
    <group {...h}>
      <Box p={[IX - 0.01, F + 0.065, -1.9]} s={[0.66, 0.012, 0.8]} c="#eef7ff" opacity={0.6} />
      {cells.map(([x, z, i]) => (
        <Bubble key={i} x={x} z={z} popped={popped.current[i]} />
      ))}
      <SoundBadge id="wrap" p={[IX, F + 0.62, -1.9]} size={0.26} />
    </group>
  )
}

/* ───────── 키캡 ───────── */
const KEYC = ['#e9dfd0', '#c9b79c', '#e9dfd0', '#a8c2b5', '#e9dfd0', '#d7a68a']
function Keycaps() {
  const caps = useRef([])
  const press = useRef(Array(6).fill(0))
  useFrame((_, dt) => {
    caps.current.forEach((m, i) => {
      if (!m) return
      press.current[i] = Math.max(0, press.current[i] - dt * 6)
      m.position.y = F + 0.14 - press.current[i] * 0.03
    })
  })
  const type = () => {
    const i = Math.floor(Math.random() * 6)
    press.current[i] = 1
    audio.key(i % 4)
  }
  const pos = [IX, F, -1.0]
  const h = useActor('keys', 'object', '⌨️ 말랑 키캡 (딸깍딸깍)', pos, () => playSound('keys', type, { ...SND, gap: [140, 380] }), 2.2)
  return (
    <group {...h}>
      <Box p={[IX, F + 0.09, -1.0]} s={[0.42, 0.05, 0.62]} c="#3a3836" r={0.5} />
      {KEYC.map((c, i) => (
        <mesh key={i} ref={(el) => (caps.current[i] = el)} position={[IX - 0.1 + (i % 2) * 0.2, F + 0.14, -1.2 + Math.floor(i / 2) * 0.2]} geometry={roundBoxGeo(0.16, 0.08, 0.16, 0.035)}>
          <meshStandardMaterial color={c} roughness={0.5} />
        </mesh>
      ))}
      <SoundBadge id="keys" p={[IX, F + 0.62, -1.0]} size={0.26} />
    </group>
  )
}

/* ───────── 말랑이 ───────── */
function Squishy() {
  const m = useRef()
  const sq = useRef(0)
  useFrame((_, dt) => {
    sq.current = Math.max(0, sq.current - dt * 2.5)
    const k = Math.sin(sq.current * Math.PI) * 0.45
    m.current.scale.set(1 + k * 0.6, 0.7 - k * 0.4, 1 + k * 0.6)
  })
  const pos = [IX, F, -0.2]
  const h = useActor('squishy', 'object', '🍡 말랑이 (조물조물)', pos, () =>
    playSound(
      'squishy',
      () => {
        sq.current = 1
        audio.squish()
      },
      { ...SND, gap: [700, 1000] }
    ), 2.2)
  return (
    <group position={[IX, F + 0.1, -0.2]} {...h}>
      <mesh ref={m} scale={[1, 0.7, 1]}>
        <sphereGeometry args={[0.13, 24, 18]} />
        <meshStandardMaterial color="#f2d2cf" roughness={0.55} />
      </mesh>
      <Sph p={[-0.115, 0.03, -0.04]} r={0.012} c="#2a1a10" />
      <Sph p={[-0.115, 0.03, 0.04]} r={0.012} c="#2a1a10" />
      <SoundBadge id="squishy" p={[0, 0.52, 0]} size={0.26} />
    </group>
  )
}

/* ───────── 솜털 귀이개 ───────── */
function EarPick() {
  const g = useRef()
  const play = useRef(0)
  useFrame(({ clock }, dt) => {
    play.current = Math.max(0, play.current - dt)
    g.current.rotation.x = 0.2 + (play.current > 0 ? Math.sin(clock.elapsedTime * 14) * 0.25 : 0)
  })
  const pos = [IX, F, 0.5]
  const h = useActor('earpick', 'object', '🪶 솜털 귀이개 (사각사각)', pos, () =>
    playSound(
      'earpick',
      () => {
        play.current = 2.2
        audio.earPick(2.1)
      },
      { ...SND, gap: [2300, 2500] }
    ), 2.2)
  return (
    <group position={[IX, F + 0.08, 0.5]} {...h}>
      <group ref={g}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.013, 0.34, 4, 8]} />
          <meshStandardMaterial color="#b8925a" roughness={0.6} />
        </mesh>
        {Array.from({ length: 10 }, (_, i) => (
          <Sph key={i} p={[Math.cos(i * 1.7) * 0.04, Math.sin(i * 2.1) * 0.04, 0.2 + Math.cos(i) * 0.03]} r={0.04} c="#ffffff" />
        ))}
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.2, 0.2, 0.5]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <SoundBadge id="earpick" p={[0, 0.54, 0]} size={0.26} />
    </group>
  )
}

/* ───────── 이부자리 · 창 ───────── */
function Bedding() {
  return (
    <group>
      <Box p={[6.3, F + 0.18, -3.25]} s={[2.0, 0.36, 1.35]} c="#f2f0ea" r={0.6} rad={0.06} />
      <Box p={[6.3, F + 0.42, -3.25]} s={[1.95, 0.12, 1.3]} c="#ffffff" r={1} rad={0.05} />
      <Box p={[5.55, F + 0.55, -3.25]} s={[0.4, 0.14, 0.8]} c="#cfc6ba" r={1} rad={0.06} />
      <Box p={[6.6, F + 0.52, -3.1]} s={[1.0, 0.08, 1.0]} c="#e7c9c9" r={1} rad={0.04} />
      {/* 옷 무더기 */}
      <Box p={[5.6, F + 0.1, 2.5]} s={[0.6, 0.2, 0.45]} c="#3a6a58" r={1} rad={0.05} />
      <Box p={[5.6, F + 0.25, 2.5]} s={[0.55, 0.1, 0.4]} c="#b89a72" r={1} rad={0.04} />
      {/* 남쪽 창 */}
      <Box p={[7.1, 1.9, 2.91]} s={[1.2, 0.9, 0.04]} c="#4a3020" />
      <mesh position={[7.1, 1.9, 2.88]} rotation-y={Math.PI}>
        <planeGeometry args={[1.08, 0.78]} />
        <meshBasicMaterial color="#cfe0d6" toneMapped={false} />
      </mesh>
      <pointLight position={[6.6, 2.5, -0.5]} color="#ffe6c0" intensity={1.6} distance={6} decay={1.6} />
    </group>
  )
}

export default function BackRoom() {
  return (
    <group>
      <DeskFort />
      <BubbleWrap />
      <Keycaps />
      <Squishy />
      <EarPick />
      <Bedding />
    </group>
  )
}
