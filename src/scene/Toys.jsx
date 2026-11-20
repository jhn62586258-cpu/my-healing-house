/* ───────── 책상 밑 아지트의 진짜로 터지고 눌리는 장난감들 ─────────
   모두 실제 크기(m), 원점 = 담요 윗면. 세트 모델(desk_hideout) 위에도, 기본 도형 위에도 올릴 수 있음
   actorPos: 액션 바(상호작용)용 공간 좌표                                             */
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useActor, playSound } from '../store'
import * as audio from '../audio/AsmrEngine'
import { SoundBadge } from './Fx'
import { roundBoxGeo } from './parts'

const SND = { dur: 6000, fade: 2200 }
const BADGE_Y = 0.3

/* 무한 뽁뽁이 */
const bubbleGeo = new THREE.SphereGeometry(0.028, 14, 10)
bubbleGeo.translate(0, 0.028, 0)
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
    <mesh ref={m} geometry={bubbleGeo} position={[x, 0.006, z]} scale={[1, 0.8, 1]}>
      <meshStandardMaterial color={popped ? '#cfe3f0' : '#e6f4ff'} transparent opacity={popped ? 0.5 : 0.78} roughness={0.15} />
    </mesh>
  )
}
export function BubbleWrapToy({ actorPos }) {
  const N = 20
  const popped = useRef(Array(N).fill(false))
  const [, force] = useState(0)
  const popOne = () => {
    const left = popped.current.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0)
    if (!left.length) popped.current = Array(N).fill(false)
    const pool = left.length ? left : [...Array(N).keys()]
    popped.current[pool[Math.floor(Math.random() * pool.length)]] = true
    audio.pop()
    force((n) => n + 1)
  }
  const h = useActor('wrap', 'object', '🫧 무한 뽁뽁이 (톡톡)', actorPos, () => playSound('wrap', popOne, { ...SND, gap: [260, 520] }), 2.2)
  const cells = []
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) cells.push([-0.105 + c * 0.07, -0.14 + r * 0.07, r * 4 + c])
  return (
    <group {...h}>
      <mesh position={[0, 0.003, 0]} geometry={roundBoxGeo(0.3, 0.006, 0.37, 0.002)}>
        <meshStandardMaterial color="#eef7ff" transparent opacity={0.6} roughness={0.2} />
      </mesh>
      {cells.map(([x, z, i]) => (
        <Bubble key={i} x={x} z={z} popped={popped.current[i]} />
      ))}
      <SoundBadge id="wrap" p={[0, BADGE_Y, 0]} size={0.22} />
    </group>
  )
}

/* 말랑 키캡 */
const KEYC = ['#e9dfd0', '#c9b79c', '#e9dfd0', '#a8c2b5', '#e9dfd0', '#d7a68a']
export function KeycapsToy({ actorPos }) {
  const caps = useRef([])
  const press = useRef(Array(6).fill(0))
  useFrame((_, dt) => {
    caps.current.forEach((m, i) => {
      if (!m) return
      press.current[i] = Math.max(0, press.current[i] - dt * 6)
      m.position.y = 0.05 - press.current[i] * 0.014
    })
  })
  const type = () => {
    const i = Math.floor(Math.random() * 6)
    press.current[i] = 1
    audio.key(i % 4)
  }
  const h = useActor('keys', 'object', '⌨️ 말랑 키캡 (딸깍딸깍)', actorPos, () => playSound('keys', type, { ...SND, gap: [140, 380] }), 2.2)
  return (
    <group {...h}>
      <mesh position={[0, 0.015, 0]} geometry={roundBoxGeo(0.2, 0.03, 0.29, 0.01)}>
        <meshStandardMaterial color="#3a3836" roughness={0.6} />
      </mesh>
      {KEYC.map((c, i) => (
        <mesh key={i} ref={(el) => (caps.current[i] = el)} position={[-0.045 + (i % 2) * 0.09, 0.05, -0.09 + Math.floor(i / 2) * 0.09]} geometry={roundBoxGeo(0.075, 0.04, 0.075, 0.016)}>
          <meshStandardMaterial color={c} roughness={0.55} />
        </mesh>
      ))}
      <SoundBadge id="keys" p={[0, BADGE_Y, 0]} size={0.22} />
    </group>
  )
}

/* 고양이 말랑이 */
export function CatSquishyToy({ actorPos }) {
  const g = useRef()
  const sq = useRef(0)
  useFrame((_, dt) => {
    sq.current = Math.max(0, sq.current - dt * 2.5)
    const k = Math.sin(sq.current * Math.PI) * 0.45
    g.current.scale.set(1 + k * 0.6, 1 - k * 0.45, 1 + k * 0.6)
  })
  const h = useActor('squishy', 'object', '🐱 고양이 말랑이 (조물조물)', actorPos, () =>
    playSound(
      'squishy',
      () => {
        sq.current = 1
        audio.squish()
      },
      { ...SND, gap: [700, 1000] }
    ), 2.2)
  const body = '#f1e2d0'
  return (
    <group {...h}>
      <group ref={g}>
        <mesh position={[0, 0.045, 0]} scale={[1, 0.72, 0.9]}>
          <sphereGeometry args={[0.065, 24, 18]} />
          <meshStandardMaterial color={body} roughness={0.6} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.035, 0.085, 0]} rotation={[0, 0, -s * 0.35]}>
            <coneGeometry args={[0.018, 0.035, 12]} />
            <meshStandardMaterial color={body} roughness={0.6} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={'e' + s} position={[s * 0.022, 0.052, 0.055]} rotation-z={Math.PI}>
            <torusGeometry args={[0.008, 0.002, 6, 10, Math.PI]} />
            <meshStandardMaterial color="#2a1c16" />
          </mesh>
        ))}
        <mesh position={[0, 0.042, 0.06]}>
          <sphereGeometry args={[0.005, 8, 6]} />
          <meshStandardMaterial color="#d98a8a" />
        </mesh>
      </group>
      <SoundBadge id="squishy" p={[0, BADGE_Y, 0]} size={0.22} />
    </group>
  )
}

/* 스케치북 — 터치하면 연필로 사각사각 그림이 그려짐 */
export function SketchbookToy({ actorPos }) {
  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 192
    const g = canvas.getContext('2d')
    g.fillStyle = '#fbf8f0'
    g.fillRect(0, 0, 256, 192)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return { canvas, tex }
  }, [])
  const stroke = useRef(0)
  // 그릴 그림: 집 · 해 · 강아지 얼굴 (선분 목록)
  const lines = useMemo(() => {
    const L = []
    const poly = (pts) => pts.slice(1).forEach((p, i) => L.push([pts[i], p]))
    poly([[40, 140], [40, 95], [80, 65], [120, 95], [120, 140], [40, 140]])
    poly([[70, 140], [70, 115], [90, 115], [90, 140]])
    for (let a = 0; a < 12; a++) {
      const t0 = (a / 12) * Math.PI * 2
      const t1 = ((a + 1) / 12) * Math.PI * 2
      L.push([[200 + Math.cos(t0) * 16, 45 + Math.sin(t0) * 16], [200 + Math.cos(t1) * 16, 45 + Math.sin(t1) * 16]])
    }
    for (let a = 0; a < 16; a++) {
      const t0 = (a / 16) * Math.PI * 2
      const t1 = ((a + 1) / 16) * Math.PI * 2
      L.push([[185 + Math.cos(t0) * 22, 130 + Math.sin(t0) * 20], [185 + Math.cos(t1) * 22, 130 + Math.sin(t1) * 20]])
    }
    poly([[166, 118], [160, 140], [172, 132]])
    poly([[204, 118], [210, 140], [198, 132]])
    return L
  }, [])
  const drawSome = () => {
    const g = canvas.getContext('2d')
    g.strokeStyle = '#5a4a3a'
    g.lineWidth = 2.2
    g.lineCap = 'round'
    if (stroke.current >= lines.length) {
      g.fillStyle = '#fbf8f0'
      g.fillRect(0, 0, 256, 192)
      stroke.current = 0
    }
    for (let k = 0; k < 4 && stroke.current < lines.length; k++, stroke.current++) {
      const [[x0, y0], [x1, y1]] = lines[stroke.current]
      g.beginPath()
      g.moveTo(x0 + Math.random(), y0 + Math.random())
      g.lineTo(x1 + Math.random(), y1 + Math.random())
      g.stroke()
    }
    tex.needsUpdate = true
    audio.pencil(0.9)
  }
  const h = useActor('sketch', 'object', '✏️ 스케치북 (사각사각 그리기)', actorPos, () => playSound('sketch', drawSome, { ...SND, gap: [900, 1200] }), 2.2)
  return (
    <group {...h}>
      <mesh position={[0, 0.006, 0]} geometry={roundBoxGeo(0.3, 0.012, 0.23, 0.004)}>
        <meshStandardMaterial color="#8a6a4a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.0125, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.28, 0.21]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      {/* 연필 */}
      <mesh position={[0.1, 0.02, 0.08]} rotation={[Math.PI / 2, 0, 0.8]}>
        <capsuleGeometry args={[0.005, 0.13, 4, 8]} />
        <meshStandardMaterial color="#e8b923" roughness={0.6} />
      </mesh>
      <SoundBadge id="sketch" p={[0, BADGE_Y, 0]} size={0.22} />
    </group>
  )
}
