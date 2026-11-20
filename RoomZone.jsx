import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world, interact, useStore } from '../store'
import * as audio from '../audio/AsmrEngine'
import { plaid } from './textures'
import { Box, Cyl, Sph, Hit } from './parts'

const F = 0.15 // 바닥 높이

/* ───────── 책상 + 늘어뜨린 담요 ───────── */
function Desk() {
  const topMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b98852', roughness: 0.7, transparent: true }), [])
  const blL = useMemo(
    () => new THREE.MeshStandardMaterial({ map: plaid('#f4c7b8', '#fff3ea', '#e79f8c', [2, 2]), roughness: 1, transparent: true, side: THREE.DoubleSide }),
    []
  )
  const blR = useMemo(
    () => new THREE.MeshStandardMaterial({ map: plaid('#b9d6e8', '#ffffff', '#8fb6d0', [2, 2]), roughness: 1, transparent: true, side: THREE.DoubleSide }),
    []
  )
  useFrame(() => {
    const o = world.fx.desk
    topMat.opacity = o
    topMat.depthWrite = o > 0.95
    blL.opacity = Math.max(0.28, o)
    blR.opacity = Math.max(0.28, o)
  })
  return (
    <group>
      <mesh position={[-8, 1.5, -4.6]} material={topMat}>
        <boxGeometry args={[3.7, 0.08, 1.7]} />
      </mesh>
      <Box p={[-8, 0.85, -5.28]} s={[3.4, 1.4, 0.06]} c="#a97a48" />
      <mesh position={[-9.82, 0.85, -4.6]} material={blL}>
        <boxGeometry args={[0.05, 1.3, 1.62]} />
      </mesh>
      <mesh position={[-6.18, 0.85, -4.6]} material={blR}>
        <boxGeometry args={[0.05, 1.3, 1.62]} />
      </mesh>
    </group>
  )
}

/* ───────── 이불 + 쿠션 ───────── */
function Bedding() {
  const quilt = useMemo(() => plaid('#fff0d9', '#f9dfc3', '#f4c9a8', [3, 1.5]), [])
  return (
    <group>
      <mesh position={[-8, F + 0.04, -4.65]}>
        <boxGeometry args={[3.3, 0.08, 1.4]} />
        <meshStandardMaterial map={quilt} roughness={1} />
      </mesh>
      <Sph p={[-9.4, F + 0.2, -5.15]} r={0.26} sc={[1, 0.6, 1]} c="#cdbdf2" rough={1} />
      <Sph p={[-6.65, F + 0.2, -5.15]} r={0.26} sc={[1, 0.6, 1]} c="#b9e8d2" rough={1} />
      <Sph p={[-8.0, F + 0.18, -5.1]} r={0.22} sc={[1.5, 0.55, 0.9]} c="#ffd0dc" rough={1} />
    </group>
  )
}

/* ───────── 꼬마전구 (페어리 라이트) ───────── */
function FairyLights() {
  const bulbs = useRef([])
  const items = useMemo(() => {
    const arr = []
    const strings = [
      { z: -3.9, n: 9, sag: 0.1 },
      { z: -4.6, n: 9, sag: 0.14 },
    ]
    strings.forEach((s) => {
      for (let i = 0; i < s.n; i++) {
        const u = i / (s.n - 1)
        arr.push([-9.6 + u * 3.2, 1.44 - Math.sin(u * Math.PI) * s.sag, s.z])
      }
    })
    return arr
  }, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    bulbs.current.forEach((m, i) => {
      if (!m) return
      const k = 0.75 + 0.25 * Math.sin(t * 2.2 + i * 1.3)
      m.material.emissiveIntensity = 1 + k * 1.6
      m.scale.setScalar(0.9 + k * 0.2)
    })
  })
  return (
    <group>
      {items.map((p, i) => (
        <mesh key={i} ref={(el) => (bulbs.current[i] = el)} position={p}>
          <sphereGeometry args={[0.035, 10, 10]} />
          <meshStandardMaterial color="#ffe8a0" emissive="#ffc94a" emissiveIntensity={2} />
        </mesh>
      ))}
      <pointLight position={[-8, 1.3, -4.5]} color="#ffcf70" intensity={5} distance={4} decay={2} />
    </group>
  )
}

/* ───────── 무한 뽁뽁이 ───────── */
const bubbleGeo = new THREE.SphereGeometry(0.105, 16, 12)
bubbleGeo.translate(0, 0.105, 0)

function Bubble({ x, z, popped, onPop }) {
  const m = useRef()
  useFrame((_, dt) => {
    const s = m.current.scale
    const k = Math.min(1, dt * 18)
    s.y += ((popped ? 0.1 : 0.78) - s.y) * k
    s.x += ((popped ? 1.12 : 1) - s.x) * k
    s.z = s.x
  })
  return (
    <mesh
      ref={m}
      geometry={bubbleGeo}
      position={[x, F + 0.05, z]}
      scale={[1, 0.78, 1]}
      {...interact('🫧 톡! 뽀독! 누르거나 드래그해요', onPop)}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
        if (e.buttons === 1 && world.dragLock) onPop()
      }}
    >
      <meshStandardMaterial color={popped ? '#cfe3f0' : '#dff1ff'} transparent opacity={popped ? 0.55 : 0.72} roughness={0.15} metalness={0.05} />
    </mesh>
  )
}

function BubbleWrap() {
  const tick = useStore((s) => s.bubbleTick)
  const popped = useRef(Array(24).fill(false))
  const [, force] = useState(0)
  useEffect(() => {
    popped.current = Array(24).fill(false)
    force((n) => n + 1)
  }, [tick])
  const pop = (i) => {
    if (popped.current[i]) return
    popped.current[i] = true
    audio.pop()
    force((n) => n + 1)
  }
  const cells = []
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 6; c++) cells.push([-9.45 + c * 0.24, -4.96 + r * 0.24, r * 6 + c])
  return (
    <group>
      <mesh position={[-8.85, F + 0.1, -4.6]}>
        <boxGeometry args={[1.65, 0.03, 1.05]} />
        <meshStandardMaterial color="#cde7f5" transparent opacity={0.5} roughness={0.2} />
      </mesh>
      {cells.map(([x, z, i]) => (
        <Bubble key={i} x={x} z={z} popped={popped.current[i]} onPop={() => pop(i)} />
      ))}
    </group>
  )
}

/* ───────── 키캡 + 젤리 고양이 ───────── */
function Keycap({ x, z, color, top, i }) {
  const g = useRef()
  const press = useRef(0)
  useFrame((_, dt) => {
    press.current = Math.max(0, press.current - dt)
    const target = press.current > 0 ? -0.07 : 0
    g.current.position.y += (target - g.current.position.y) * Math.min(1, dt * 30)
  })
  return (
    <group
      position={[x, 0.05, z]}
      {...interact('⌨️ 찰칵! 키캡을 눌러봐요', () => {
        press.current = 0.14
        audio.key(i)
      })}
    >
      <Box p={[0, 0.02, 0]} s={[0.15, 0.04, 0.15]} c="#3a3a40" />
      <group ref={g}>
        <Box p={[0, 0.1, 0]} s={[0.22, 0.14, 0.22]} c={color} r={0.5} />
        <Box p={[0, 0.175, 0]} s={[0.17, 0.02, 0.17]} c={top} r={0.4} />
      </group>
    </group>
  )
}

function JellyCat({ position }) {
  const g = useRef()
  const t = useRef(99)
  useFrame((_, dt) => {
    t.current += dt
    const sq = t.current < 2 ? Math.exp(-3.4 * t.current) * Math.cos(17 * t.current) : 0
    g.current.scale.set(1 + 0.4 * sq, 1 - 0.5 * sq, 1 + 0.4 * sq)
  })
  return (
    <group position={position}>
      <group
        ref={g}
        {...interact('🐱 말랑말랑 젤리 고양이', () => {
          t.current = 0
          audio.squish()
        })}
      >
        <mesh position={[0, 0.12, 0]} scale={[1, 0.8, 0.9]}>
          <sphereGeometry args={[0.16, 24, 18]} />
          <meshPhysicalMaterial color="#ffc2a1" transparent opacity={0.88} roughness={0.15} clearcoat={1} />
        </mesh>
        <mesh position={[-0.085, 0.27, 0]} rotation={[0, 0, 0.25]}>
          <coneGeometry args={[0.05, 0.1, 4]} />
          <meshPhysicalMaterial color="#ffc2a1" transparent opacity={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0.085, 0.27, 0]} rotation={[0, 0, -0.25]}>
          <coneGeometry args={[0.05, 0.1, 4]} />
          <meshPhysicalMaterial color="#ffc2a1" transparent opacity={0.9} roughness={0.15} />
        </mesh>
        <Sph p={[-0.055, 0.15, 0.13]} r={0.016} c="#3a2a28" seg={8} />
        <Sph p={[0.055, 0.15, 0.13]} r={0.016} c="#3a2a28" seg={8} />
        <Sph p={[0, 0.115, 0.145]} r={0.014} c="#ff8fa3" seg={8} />
      </group>
    </group>
  )
}

function KeyTray() {
  const caps = [
    ['#f9b4c8', '#fdd6e2'],
    ['#b8e8d0', '#dcf6ea'],
    ['#cdb9f0', '#e5d9f9'],
    ['#fbe7a1', '#fff4cc'],
  ]
  return (
    <group position={[-7.25, F + 0.08, -4.62]}>
      <Box p={[0, 0.0, 0]} s={[1.3, 0.05, 0.85]} c="#c79a62" r={0.8} />
      <Box p={[0, 0.04, -0.4]} s={[1.3, 0.06, 0.05]} c="#b4864f" />
      <Box p={[0, 0.04, 0.4]} s={[1.3, 0.06, 0.05]} c="#b4864f" />
      <Box p={[-0.625, 0.04, 0]} s={[0.05, 0.06, 0.85]} c="#b4864f" />
      <Box p={[0.625, 0.04, 0]} s={[0.05, 0.06, 0.85]} c="#b4864f" />
      {caps.map((c, i) => (
        <Keycap key={i} x={-0.405 + i * 0.27} z={-0.2} color={c[0]} top={c[1]} i={i} />
      ))}
      <JellyCat position={[0.1, 0.03, 0.18]} />
    </group>
  )
}

/* ───────── 스케치북 + 연필 (사각사각, 실제로 그려져요) ───────── */
function Sketch() {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 180
    const g = c.getContext('2d')
    g.fillStyle = '#fffdf6'
    g.fillRect(0, 0, 256, 180)
    return c
  }, [])
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [canvas])
  const pencil = useRef()
  const a = useRef({ t: 0, on: false, cx: 128, cy: 90, fx: 12, fy: 8, x: 128, y: 90 })

  const start = () => {
    const s = a.current
    if (s.on) return
    s.on = true
    s.t = 0
    s.cx = 80 + Math.random() * 96
    s.cy = 55 + Math.random() * 70
    s.fx = 9 + Math.random() * 7
    s.fy = 6 + Math.random() * 6
    s.x = s.cx
    s.y = s.cy
    audio.pencil(1.6)
  }

  useFrame((_, dt) => {
    const s = a.current
    if (!s.on) return
    s.t += dt
    const ox = Math.sin(s.t * s.fx) * 0.18
    const oz = Math.cos(s.t * s.fy) * 0.09
    const nx = s.cx + ox * 427
    const ny = s.cy + oz * 427
    pencil.current.position.set((nx - 128) / 427, 0.06, (ny - 90) / 427)
    const g = canvas.getContext('2d')
    g.strokeStyle = '#4a4040'
    g.lineWidth = 1.6
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(s.x, s.y)
    g.lineTo(nx, ny)
    g.stroke()
    s.x = nx
    s.y = ny
    tex.needsUpdate = true
    if (s.t > 1.6) {
      s.on = false
      pencil.current.position.set(0.12, 0.06, -0.12)
    }
  })

  return (
    <group position={[-7.35, F + 0.08, -4.02]}>
      <Box p={[0, 0.02, 0]} s={[0.66, 0.04, 0.46]} c="#e9a8a0" />
      <mesh position={[0, 0.043, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.42]} />
        <meshStandardMaterial map={tex} roughness={1} />
      </mesh>
      <group ref={pencil} position={[0.12, 0.06, -0.12]} {...interact('✏️ 사각사각 연필', start)}>
        <group rotation={[0, 0, -1.2208]}>
          <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.018, 0.06, 6]} />
            <meshStandardMaterial color="#e8c9a0" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.0075, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.006, 0.015, 6]} />
            <meshStandardMaterial color="#333" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.185, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.25, 6]} />
            <meshStandardMaterial color="#f6c445" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.305, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.015, 8]} />
            <meshStandardMaterial color="#c9ccd1" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.325, 0]}>
            <cylinderGeometry args={[0.019, 0.019, 0.03, 8]} />
            <meshStandardMaterial color="#f2a6b5" roughness={0.8} />
          </mesh>
        </group>
        <Hit p={[0.13, 0.06, 0]} s={[0.4, 0.14, 0.14]} />
      </group>
    </group>
  )
}

/* ───────── 방 가구 (책장, 러그, 등) ───────── */
function RoomDecor() {
  const books = useMemo(() => {
    const cols = ['#e58f8f', '#8fb8e5', '#e5d28f', '#9fd6a8', '#c6a4e8', '#f0b27a']
    const arr = []
    for (let r = 0; r < 3; r++)
      for (let i = 0; i < 7; i++) arr.push([r, i, cols[(r * 3 + i) % cols.length], 0.25 + ((i * 7 + r * 3) % 5) * 0.03])
    return arr
  }, [])
  return (
    <group>
      <mesh position={[-6.8, F + 0.01, -1.6]}>
        <cylinderGeometry args={[1.1, 1.1, 0.02, 32]} />
        <meshStandardMaterial color="#e7c3b2" roughness={1} />
      </mesh>
      <group position={[-4.3, F, -5.0]}>
        <Box p={[0, 0.8, 0]} s={[0.4, 1.6, 1.4]} c="#a47848" />
        {[0.3, 0.8, 1.3].map((y) => (
          <Box key={y} p={[0.02, y, 0]} s={[0.4, 0.04, 1.36]} c="#8d6439" />
        ))}
        {books.map(([r, i, c, h]) => (
          <Box key={r * 10 + i} p={[0.05, 0.05 + r * 0.5 + h / 2 + 0.02, -0.55 + i * 0.18]} s={[0.25, h, 0.12]} c={c} />
        ))}
      </group>
      <Cyl p={[-6.8, 3.0 - 0.15, -2.5]} r={0.01} h={0.3} c="#444" />
      <Sph p={[-6.8, 2.5, -2.5]} r={0.16} c="#ffe3b0" emissive="#ffcf80" ei={1.5} />
      <pointLight position={[-6.8, 2.4, -2.5]} color="#ffd9a0" intensity={10} distance={7} decay={2} />
    </group>
  )
}

export default function RoomZone() {
  return (
    <group>
      <Desk />
      <Bedding />
      <FairyLights />
      <BubbleWrap />
      <KeyTray />
      <Sketch />
      <RoomDecor />
    </group>
  )
}
