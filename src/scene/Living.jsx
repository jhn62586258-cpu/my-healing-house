import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world, interact, moveTo, useStore, setState, showToast, FLOOR, DAD_LINES } from '../store'
import * as audio from '../audio/AsmrEngine'
import { rugTex, clockFace } from './textures'
import { Box, Cyl, Sph, roundCylGeo } from './parts'
import { Dad } from './Character'
import { Dog } from './Dogs'
import { SpeechBubble, Hearts, Steam, Sparkle } from './Fx'

const F = FLOOR
const pick = (arr, prev) => {
  let s = arr[Math.floor(Math.random() * arr.length)]
  if (s === prev && arr.length > 1) s = arr[(arr.indexOf(s) + 1) % arr.length]
  return s
}

/* ───────── 러그 ───────── */
function Rug() {
  const tex = useMemo(() => rugTex(), [])
  return (
    <mesh position={[-3.85, F + 0.006, -2.1]} rotation-x={-Math.PI / 2} onClick={moveTo}>
      <planeGeometry args={[3.1, 2.8]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  )
}

/* ───────── TV ───────── */
const CHANNELS = ['#7fb4e8', '#f2b56b', '#8fd18f', '#e88fb0', '#c7b2f0']
function TV() {
  const scr = useRef()
  const ch = useRef(0)
  const flash = useRef(0)
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    flash.current = Math.max(0, flash.current - dt * 3)
    const base = new THREE.Color(CHANNELS[ch.current])
    const k = 0.85 + Math.sin(t * 7) * 0.07 + Math.sin(t * 2.3) * 0.08
    scr.current.color.copy(base).multiplyScalar(0.35)
    scr.current.emissive.copy(base)
    scr.current.emissiveIntensity = flash.current > 0 ? 2.2 : k
  })
  const pos = [-5.72, F + 1.05, -2.1]
  const act = () => {
    ch.current = (ch.current + 1) % CHANNELS.length
    flash.current = 0.4
    audio.tvStatic()
    showToast('📺 채널 돌리기 — 아빠: "어, 그거 보던 건데~"')
  }
  return (
    <group>
      {/* TV 장 */}
      <Box p={[-5.72, F + 0.25, -2.1]} s={[0.5, 0.5, 1.7]} c="#6b4426" r={0.7} />
      <Box p={[-5.46, F + 0.25, -2.1]} s={[0.02, 0.3, 1.5]} c="#4e2f18" />
      <group {...interact('📺 켜져 있는 TV (터치: 채널 돌리기)', act, pos, 2.6)}>
        <Box p={pos} s={[0.12, 0.82, 1.34]} c="#6f6a72" r={0.6} rad={0.05} />
        <mesh position={[pos[0] + 0.045, pos[1], pos[2]]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[1.2, 0.68]} />
          <meshStandardMaterial ref={scr} color="#333" emissive="#7fb4e8" emissiveIntensity={0.9} roughness={0.3} />
        </mesh>
        <Box p={[-5.72, F + 0.55, -2.1]} s={[0.25, 0.1, 0.3]} c="#6f6a72" />
      </group>
      <pointLight position={[-5.2, F + 1.1, -2.1]} color="#9cc8ff" intensity={1.2} distance={3} decay={2} />
    </group>
  )
}

/* ───────── 소파 + 아빠 ───────── */
function SofaDad() {
  const bubble = useRef()
  const head = useRef()
  const chest = useRef()
  const near = useRef(false)
  const lastLine = useRef('')
  const say = () => {
    lastLine.current = pick(DAD_LINES, lastLine.current)
    bubble.current.say(lastLine.current)
  }
  const pos = [-2.55, F, -2.1]
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const p = world.player
    const d = Math.hypot(p.x - pos[0], p.z - pos[2])
    if (d < 1.9 && !near.current) {
      near.current = true
      say()
    } else if (d > 2.8) near.current = false
    chest.current.scale.y = 1 + Math.sin(t * 1.6) * 0.015
    // 플레이어가 가까우면 고개 돌려 보기
    const want = d < 2.8 ? Math.max(-0.9, Math.min(0.9, Math.atan2(p.z - pos[2], -(p.x - pos[0])))) : Math.sin(t * 0.3) * 0.1
    head.current.rotation.y += (want - head.current.rotation.y) * 0.05
  })
  return (
    <group>
      {/* 푹신한 소파 (앞쪽이 -x 방향, TV를 봄) */}
      <Box p={[-2.5, F + 0.2, -2.12]} s={[0.95, 0.4, 2.3]} c="#7a4b37" r={1} />
      <Box p={[-2.6, F + 0.47, -2.12]} s={[0.78, 0.16, 2.0]} c="#a26a4c" r={1} />
      <Box p={[-2.17, F + 0.75, -2.12]} s={[0.28, 0.75, 2.3]} c="#7a4b37" r={1} />
      {[-2.75, -2.1, -1.45].map((z) => (
        <Box key={z} p={[-2.33, F + 0.78, z]} s={[0.18, 0.5, 0.6]} c="#b37a59" r={1} />
      ))}
      {[-3.22, -1.02].map((z) => (
        <Box key={z} p={[-2.5, F + 0.55, z]} s={[0.95, 0.4, 0.18]} c="#6d412f" r={1} />
      ))}
      <Sph p={[-2.45, F + 0.72, -3.0]} r={0.16} sc={[0.6, 1, 1]} c="#f0d48a" />
      <group position={[-2.5, F - 0.06, -1.85]} rotation={[0, -Math.PI / 2, 0]} {...interact('👨 소파에서 TV 보는 아빠', say, pos, 2.4)}>
        <Dad headRef={head} chestRef={chest} />
        <SpeechBubble ref={bubble} y={1.75} />
      </group>
    </group>
  )
}

/* ───────── 낮은 테이블 + 옛날 유선 전화기 ───────── */
function PhoneTable() {
  const bubble = useRef()
  const shake = useRef(0)
  const handset = useRef()
  const cord = useMemo(() => {
    const pts = []
    const a = new THREE.Vector3(0.11, 0.03, 0)
    const b = new THREE.Vector3(0.2, 0.0, 0.14)
    for (let i = 0; i <= 120; i++) {
      const u = i / 120
      const c = a.clone().lerp(b, u)
      c.y -= Math.sin(u * Math.PI) * 0.06
      const ang = u * Math.PI * 2 * 14
      pts.push(new THREE.Vector3(c.x + Math.cos(ang) * 0.012, c.y + Math.sin(ang) * 0.012, c.z))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.004, 5)
  }, [])
  useFrame(({ clock }, dt) => {
    shake.current = Math.max(0, shake.current - dt)
    handset.current.position.y = 0.11 + (shake.current > 0 ? Math.abs(Math.sin(clock.elapsedTime * 60)) * 0.01 : 0)
  })
  const pos = [-4.2, F + 0.4, -2.1]
  const act = () => {
    audio.ring()
    shake.current = 1.6
    setTimeout(() => bubble.current?.say('여보세요~ 응, 엄마야! 밥은 먹었니?'), 1700)
  }
  return (
    <group>
      <Box p={[-4.2, F + 0.3, -2.1]} s={[0.9, 0.05, 0.65]} c="#9a6232" r={0.6} />
      {[
        [-0.38, -0.26],
        [0.38, -0.26],
        [-0.38, 0.26],
        [0.38, 0.26],
      ].map(([x, z], i) => (
        <Box key={i} p={[-4.2 + x, F + 0.14, -2.1 + z]} s={[0.06, 0.28, 0.06]} c="#7a4a24" />
      ))}
      <Sph p={[-3.95, F + 0.36, -1.88]} r={0.07} sc={[1, 0.5, 1]} c="#f7f3ea" />
      <group position={[-4.3, F + 0.33, -2.15]} rotation={[0, 0.5, 0]} {...interact('☎️ 옛날 유선 전화기 (따르릉)', act, pos, 2.2)}>
        <Box p={[0, 0.05, 0]} s={[0.22, 0.1, 0.24]} c="#efe4cc" r={0.4} />
        <Cyl p={[0, 0.105, 0.04]} r={0.065} h={0.012} c="#d8cfbb" />
        <Cyl p={[0, 0.113, 0.04]} r={0.018} h={0.01} c="#a49a86" />
        <group ref={handset} position={[0, 0.11, -0.06]}>
          <Box p={[0, 0.03, 0]} s={[0.22, 0.03, 0.045]} c="#efe4cc" r={0.4} />
          <Box p={[-0.1, 0.0, 0]} s={[0.06, 0.05, 0.06]} c="#efe4cc" r={0.4} />
          <Box p={[0.1, 0.0, 0]} s={[0.06, 0.05, 0.06]} c="#efe4cc" r={0.4} />
        </group>
        <mesh geometry={cord}>
          <meshStandardMaterial color="#e6dac2" roughness={0.6} />
        </mesh>
        <SpeechBubble ref={bubble} y={0.95} />
      </group>
    </group>
  )
}

/* ───────── 벽시계 ───────── */
function Clock() {
  const tex = useMemo(() => clockFace(), [])
  const h = useRef()
  const m = useRef()
  const s = useRef()
  const g = useRef()
  useFrame(() => {
    g.current.visible = (world.fx.partL ?? 1) > 0.6
    const d = new Date()
    const sec = d.getSeconds() + d.getMilliseconds() / 1000
    const min = d.getMinutes() + sec / 60
    const hr = (d.getHours() % 12) + min / 60
    s.current.rotation.z = -(sec / 60) * Math.PI * 2
    m.current.rotation.z = -(min / 60) * Math.PI * 2
    h.current.rotation.z = -(hr / 12) * Math.PI * 2
  })
  const hand = (ref, len, w, c, z) => (
    <group ref={ref} position={[0, 0, z]}>
      <mesh position={[0, len / 2, 0]}>
        <boxGeometry args={[w, len, 0.005]} />
        <meshBasicMaterial color={c} />
      </mesh>
    </group>
  )
  return (
    <group ref={g} position={[-4.6, 2.35, -3.9]}>
      <mesh rotation-x={Math.PI / 2}>
        <primitive object={roundCylGeo(0.27, 0.27, 0.07, 32, 0.03)} attach="geometry" />
        <meshStandardMaterial color="#d4a87c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.027]}>
        <circleGeometry args={[0.22, 32]} />
        <meshBasicMaterial map={tex} />
      </mesh>
      {hand(h, 0.11, 0.018, '#2a1a10', 0.03)}
      {hand(m, 0.17, 0.012, '#2a1a10', 0.033)}
      {hand(s, 0.19, 0.005, '#c0392b', 0.036)}
    </group>
  )
}

/* ───────── 겨울 난로 + 양은 주전자 ───────── */
function StoveKettle() {
  const on = useStore((s) => s.kettleOn)
  const lid = useRef()
  useFrame(({ clock }) => {
    lid.current.position.y = 0.2 + (on ? Math.abs(Math.sin(clock.elapsedTime * 18)) * 0.008 : 0)
  })
  const pos = [0.95, F + 0.7, -3.25]
  const act = () => {
    const next = !on
    setState({ kettleOn: next })
    audio.setAmbient('kettle', next)
    showToast(next ? '🫖 주전자 물이 끓기 시작해요… 뿌우~' : '🫖 주전자를 난로에서 내렸어요')
  }
  return (
    <group>
      {/* 석유난로 */}
      <group position={[0.95, F, -3.25]}>
        <Cyl p={[0, 0.3, 0]} r={0.32} h={0.58} c="#a9b8c4" seg={28} rad={0.08} />
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.326, 0.326, 0.24, 24, 1, true]} />
          <meshStandardMaterial color="#ffb27a" emissive="#ff9a5a" emissiveIntensity={1.1} transparent opacity={0.85} />
        </mesh>
        <Cyl p={[0, 0.61, 0]} r={0.35} h={0.06} c="#dfe6ea" seg={28} />
        <Cyl p={[0, 0.03, 0]} r={0.36} h={0.06} c="#9aa3ab" seg={28} />
        <pointLight position={[0, 0.5, 0.4]} color="#ff9a4a" intensity={2} distance={2.6} decay={2} />
      </group>
      {/* 양은 주전자 */}
      <group position={pos} {...interact('🫖 난로 위 양은 주전자 (터치: 물 끓이기 ON/OFF)', act, pos, 2.3)}>
        <mesh>
          <primitive object={roundCylGeo(0.13, 0.18, 0.2, 24, 0.04)} attach="geometry" />
          <meshStandardMaterial color="#e8cf8a" metalness={0.45} roughness={0.35} />
        </mesh>
        <group ref={lid}>
          <Cyl p={[0, 0, 0]} r={0.12} h={0.02} c="#cfa84e" />
          <Sph p={[0, 0.03, 0]} r={0.025} c="#3a2a1a" />
        </group>
        <mesh position={[0.2, 0.05, 0]} rotation={[0, 0, -0.9]}>
          <capsuleGeometry args={[0.025, 0.16, 4, 10]} />
          <meshStandardMaterial color="#e8cf8a" metalness={0.45} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.17, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.11, 0.012, 6, 16, Math.PI]} />
          <meshStandardMaterial color="#3a2a1a" />
        </mesh>
        <Steam on={on} p={[0.27, 0.12, 0]} spread={0.06} rise={0.7} size={0.18} />
        <Steam on={on} p={[0, 0.22, 0]} n={4} spread={0.04} rise={0.5} size={0.14} />
      </group>
      <Sparkle p={[0.95, F + 1.15, -3.25]} />
    </group>
  )
}

/* ───────── 마루 위 갈색 푸들 ───────── */
function Poodle() {
  const dog = useRef()
  const hearts = useRef()
  const pos = [0.1, F, -1.25]
  const act = () => {
    dog.current.wag(2.5)
    hearts.current.burst()
    audio.whine()
  }
  return (
    <group position={pos} rotation={[0, 0.25, 0]} {...interact('🐩 햇살 아래 엎드린 푸들 (쓰담쓰담)', act, pos, 2.0)}>
      <Dog ref={dog} pose="lie" kind="poodle" color="#dba06f" light="#f0cfa6" size={0.9} />
      <Hearts ref={hearts} y={0.55} />
    </group>
  )
}

/* 방석·소품 */
function Props() {
  const frame = useRef()
  useFrame(() => {
    frame.current.visible = (world.fx.partL ?? 1) > 0.6
  })
  return (
    <group>
      <Box p={[-0.9, F + 0.04, -2.5]} s={[0.6, 0.08, 0.6]} c="#c0504d" r={1} />
      <Box p={[-1.0, F + 0.11, -2.4]} s={[0.55, 0.06, 0.55]} c="#e0a83e" r={1} rot={[0, 0.3, 0]} />
      {/* 화분 */}
      <Cyl p={[-5.6, F + 0.2, -3.55]} r={0.18} rb={0.14} h={0.4} c="#a0522d" />
      <Sph p={[-5.6, F + 0.6, -3.55]} r={0.3} c="#4f7f3a" />
      {/* 액자 */}
      <group ref={frame}>
        <Box p={[-3.2, 2.2, -3.9]} s={[0.6, 0.45, 0.03]} c="#7a4a28" />
        <Box p={[-3.2, 2.2, -3.88]} s={[0.5, 0.35, 0.02]} c="#e9dcc3" />
      </group>
    </group>
  )
}

export default function Living() {
  return (
    <group>
      <Rug />
      <TV />
      <SofaDad />
      <PhoneTable />
      <Clock />
      <StoveKettle />
      <Poodle />
      <Props />
      <pointLight position={[-2, 2.7, -2]} color="#ffd9a0" intensity={4} distance={9} decay={1.6} />
    </group>
  )
}
