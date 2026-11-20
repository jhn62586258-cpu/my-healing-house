import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world, interact, showToast, nearDesk, FLOOR } from '../store'
import * as audio from '../audio/AsmrEngine'
import { plaid } from './textures'
import { Box, Cyl, Sph, Hit, roundBoxGeo } from './parts'
import { Sparkle } from './Fx'

const F = FLOOR
const DESK_Y = F + 1.42

/* ───────── 책상 + 늘어뜨린 담요 (아지트) ───────── */
function DeskFort() {
  const topMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c49a62', roughness: 0.7, transparent: true }), [])
  const mon = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7d7884', roughness: 0.5, transparent: true }), [])
  const bl = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ map: plaid('#f4c7b8', '#fff3ea', '#e79f8c', [2, 2]), roughness: 1, transparent: true, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: plaid('#b9d6e8', '#ffffff', '#8fb6d0', [2, 2]), roughness: 1, transparent: true, side: THREE.DoubleSide }),
    ],
    []
  )
  useFrame((_, dt) => {
    const p = world.player
    const fx = world.fx
    fx.desk += ((nearDesk(p.x, p.z) ? 0.15 : 1) - fx.desk) * Math.min(1, dt * 5)
    topMat.opacity = fx.desk
    topMat.depthWrite = fx.desk > 0.95
    mon.opacity = fx.desk
    bl.forEach((m) => (m.opacity = Math.max(0.35, fx.desk)))
  })
  return (
    <group>
      <mesh position={[-3.9, DESK_Y, -6.2]} material={topMat} raycast={() => null}>
        <primitive object={roundBoxGeo(3.6, 0.09, 1.6, 0.04)} attach="geometry" />
      </mesh>
      <mesh position={[-4.1, DESK_Y + 0.3, -6.75]} material={mon} raycast={() => null}>
        <primitive object={roundBoxGeo(0.95, 0.55, 0.06, 0.03)} attach="geometry" />
      </mesh>
      <mesh position={[-5.78, F + 0.7, -6.2]} material={bl[0]} raycast={() => null}>
        <primitive object={roundBoxGeo(0.06, 1.4, 1.55, 0.03)} attach="geometry" />
      </mesh>
      <mesh position={[-2.33, F + 0.7, -6.2]} material={bl[1]} raycast={() => null}>
        <primitive object={roundBoxGeo(0.06, 1.4, 1.55, 0.03)} attach="geometry" />
      </mesh>
      {/* 아지트 바닥 이불 + 쿠션 */}
      <Box p={[-4.0, F + 0.03, -6.3]} s={[3.2, 0.06, 1.3]} c="#fff0d9" r={1} />
      <Sph p={[-5.3, F + 0.18, -6.75]} r={0.24} sc={[1, 0.6, 1]} c="#cdbdf2" rough={1} />
      <Sph p={[-2.75, F + 0.18, -6.75]} r={0.24} sc={[1, 0.6, 1]} c="#b9e8d2" rough={1} />
      <FairyLights />
    </group>
  )
}

function FairyLights() {
  const bulbs = useRef([])
  const items = useMemo(() => {
    const arr = []
    for (let i = 0; i < 12; i++) {
      const u = i / 11
      arr.push([-5.6 + u * 3.2, DESK_Y - 0.08 - Math.sin(u * Math.PI) * 0.12, -5.5])
    }
    return arr
  }, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    bulbs.current.forEach((m, i) => {
      if (!m) return
      const k = 0.75 + 0.25 * Math.sin(t * 2.2 + i * 1.3)
      m.material.emissiveIntensity = 1 + k * 1.6
    })
  })
  return (
    <group>
      {items.map((p, i) => (
        <mesh key={i} ref={(el) => (bulbs.current[i] = el)} position={p}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#ffe8a0" emissive="#ffc94a" emissiveIntensity={2} />
        </mesh>
      ))}
      <pointLight position={[-4, F + 0.9, -6]} color="#ffcf70" intensity={3} distance={4} decay={2} />
    </group>
  )
}

/* ───────── 무한 뽁뽁이 ───────── */
const bubbleGeo = new THREE.SphereGeometry(0.06, 14, 10)
bubbleGeo.translate(0, 0.06, 0)
function Bubble({ x, z, popped, onPop }) {
  const m = useRef()
  useFrame((_, dt) => {
    const s = m.current.scale
    const k = Math.min(1, dt * 18)
    s.y += ((popped ? 0.12 : 0.8) - s.y) * k
    s.x += ((popped ? 1.12 : 1) - s.x) * k
    s.z = s.x
  })
  return (
    <mesh ref={m} geometry={bubbleGeo} position={[x, F + 0.065, z]} scale={[1, 0.8, 1]} {...interact('🫧 뽁뽁이 (톡!)', onPop, [-4.95, F, -5.95], 2.0)}>
      <meshStandardMaterial color={popped ? '#cfe3f0' : '#e6f4ff'} transparent opacity={popped ? 0.5 : 0.75} roughness={0.15} />
    </mesh>
  )
}
function BubbleWrap() {
  const popped = useRef(Array(20).fill(false))
  const [, force] = useState(0)
  const pop = (i) => {
    if (popped.current[i]) return
    popped.current[i] = true
    audio.pop()
    if (popped.current.every(Boolean)) {
      setTimeout(() => {
        popped.current = Array(20).fill(false)
        force((n) => n + 1)
        showToast('🫧 새 뽁뽁이로 리필했어요!')
      }, 700)
    }
    force((n) => n + 1)
  }
  const cells = []
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) cells.push([-5.25 + c * 0.15, -6.18 + r * 0.15, r * 5 + c])
  return (
    <group>
      <Box p={[-4.95, F + 0.065, -5.955]} s={[0.78, 0.01, 0.64]} c="#eef7ff" opacity={0.6} />
      {cells.map(([x, z, i]) => (
        <Bubble key={i} x={x} z={z} popped={popped.current[i]} onPop={() => pop(i)} />
      ))}
      <Sparkle p={[-4.95, F + 0.45, -5.95]} />
    </group>
  )
}

/* ───────── 키캡 ───────── */
const KEYC = ['#ffd1dc', '#c9f0e0', '#fff1b8', '#d7ccff', '#ffd9b0', '#cfe8ff']
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
  return (
    <group>
      <Box p={[-3.95, F + 0.09, -5.95]} s={[0.62, 0.05, 0.42]} c="#f7f2ea" r={0.5} />
      {KEYC.map((c, i) => {
        const x = -4.15 + (i % 3) * 0.2
        const z = -6.05 + Math.floor(i / 3) * 0.2
        return (
          <mesh
            key={i}
            ref={(el) => (caps.current[i] = el)}
            position={[x, F + 0.14, z]}
            {...interact('⌨️ 말랑 키캡 (딸깍)', () => {
              press.current[i] = 1
              audio.key(i % 4)
            }, [-3.95, F, -5.95], 2.0)}
          >
            <primitive object={roundBoxGeo(0.16, 0.08, 0.16, 0.035)} attach="geometry" />
            <meshStandardMaterial color={c} roughness={0.5} />
          </mesh>
        )
      })}
      <Sparkle p={[-3.95, F + 0.45, -5.95]} />
    </group>
  )
}

/* ───────── 말랑이 (모찌 스퀴시) ───────── */
function Squishy() {
  const m = useRef()
  const sq = useRef(0)
  useFrame((_, dt) => {
    sq.current = Math.max(0, sq.current - dt * 2.5)
    const k = Math.sin(sq.current * Math.PI) * 0.45
    m.current.scale.set(1 + k * 0.6, 0.7 - k * 0.4, 1 + k * 0.6)
  })
  const pos = [-3.15, F, -5.95]
  return (
    <group position={[-3.15, F + 0.1, -5.95]}>
      <mesh
        ref={m}
        scale={[1, 0.7, 1]}
        {...interact('🍡 말랑이 (조물조물)', () => {
          sq.current = 1
          audio.squish()
        }, pos, 2.0)}
      >
        <sphereGeometry args={[0.13, 20, 16]} />
        <meshStandardMaterial color="#ffc6d6" roughness={0.6} />
      </mesh>
      <Sph p={[-0.04, 0.03, 0.115]} r={0.012} c="#3a2a1a" />
      <Sph p={[0.04, 0.03, 0.115]} r={0.012} c="#3a2a1a" />
      <Sparkle p={[0, 0.35, 0]} />
    </group>
  )
}

/* ───────── 솜털 귀이개 ───────── */
function EarPick() {
  const g = useRef()
  const play = useRef(0)
  useFrame(({ clock }, dt) => {
    play.current = Math.max(0, play.current - dt)
    g.current.rotation.z = 0.25 + (play.current > 0 ? Math.sin(clock.elapsedTime * 14) * 0.25 : 0)
  })
  const pos = [-2.65, F, -6.0]
  return (
    <group position={[-2.65, F + 0.08, -6.0]}>
      <group
        ref={g}
        {...interact('🪶 솜털 귀이개 (사각사각)', () => {
          play.current = 2.6
          audio.earPick()
        }, pos, 2.0)}
      >
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.013, 0.34, 4, 8]} />
          <meshStandardMaterial color="#c8a06a" roughness={0.6} />
        </mesh>
        {Array.from({ length: 10 }, (_, i) => (
          <Sph key={i} p={[0.2 + Math.cos(i) * 0.03, Math.sin(i * 2.1) * 0.04, Math.cos(i * 1.7) * 0.04]} r={0.04} c="#ffffff" />
        ))}
        <Hit p={[0.05, 0, 0]} s={[0.5, 0.2, 0.2]} />
      </group>
      <Sparkle p={[0, 0.35, 0]} />
    </group>
  )
}

/* ───────── 이부자리 (사진 속 흰 침구) ───────── */
function Bedding() {
  return (
    <group>
      <Box p={[0.95, F + 0.2, -6.3]} s={[1.9, 0.4, 1.4]} c="#f4f4f1" r={0.6} />
      <Box p={[0.95, F + 0.46, -6.3]} s={[1.85, 0.12, 1.35]} c="#ffffff" r={1} />
      <Box p={[0.35, F + 0.58, -6.3]} s={[0.4, 0.12, 0.8]} c="#d8cfc4" r={1} />
      <Box p={[1.3, F + 0.56, -6.1]} s={[0.8, 0.08, 0.9]} c="#f6c9d0" r={1} />
      {/* 옷 무더기 */}
      <Box p={[-1.0, F + 0.1, -6.6]} s={[0.6, 0.2, 0.45]} c="#3a8a6a" r={1} />
      <Box p={[-1.0, F + 0.25, -6.6]} s={[0.55, 0.1, 0.4]} c="#c9a77a" r={1} />
    </group>
  )
}

export default function BackRoom() {
  useEffect(() => () => {}, [])
  return (
    <group>
      <DeskFort />
      <BubbleWrap />
      <Keycaps />
      <Squishy />
      <EarPick />
      <Bedding />
      <pointLight position={[-1, 2.6, -5.5]} color="#ffe6c0" intensity={2} distance={6} decay={1.6} />
    </group>
  )
}
