import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world, useActor, moveTo, useStore, showToast, playSound, playAmbient, FLOOR, DAD_LINES } from '../store'
import * as audio from '../audio/AsmrEngine'
import { rugTex, clockFace, tvScreen } from './textures'
import { Box, Cyl, Sph, roundBoxGeo, roundCylGeo } from './parts'
import { Dad } from './Character'
import { Dog } from './Dogs'
import { SpeechBubble, Hearts, Steam, SoundBadge } from './Fx'

const F = FLOOR
const WOOD = '#6b4429'
export const pick = (arr, prev) => {
  let s = arr[Math.floor(Math.random() * arr.length)]
  if (s === prev && arr.length > 1) s = arr[(arr.indexOf(s) + 1) % arr.length]
  return s
}

/* ───────── 러그 ───────── */
function Rug() {
  const tex = useMemo(() => rugTex(), [])
  return (
    <mesh position={[-0.75, F + 0.008, -3.4]} rotation-x={-Math.PI / 2} onClick={moveTo} userData={{ noCast: true }}>
      <planeGeometry args={[3.0, 2.4]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  )
}

/* ───────── TV + TV장 ───────── */
function TV() {
  const scr = useRef()
  const flash = useRef(0)
  const tex = useMemo(() => tvScreen(), [])
  useFrame(({ clock }, dt) => {
    flash.current = Math.max(0, flash.current - dt * 3)
    scr.current.color.setScalar(flash.current > 0 ? 1.6 : 0.95 + Math.sin(clock.elapsedTime * 3) * 0.03)
  })
  const pos = [-1.3, F + 0.95, -5.6]
  const h = useActor('tv', 'object', '📺 켜져 있는 TV (채널 돌리기)', pos, () => {
    flash.current = 0.4
    audio.tvStatic()
    showToast('📺 아빠: "어, 그거 보던 건데~"')
  })
  return (
    <group>
      <Box p={[-1.3, F + 0.25, -5.7]} s={[2.4, 0.5, 0.55]} c="#5a3a24" r={0.6} />
      {[-2.0, -0.6].map((x) => (
        <Box key={x} p={[x, F + 0.27, -5.42]} s={[0.6, 0.3, 0.02]} c="#4a2e1c" />
      ))}
      <Cyl p={[-0.4, F + 0.56, -5.65]} r={0.09} rb={0.08} h={0.1} c="#efe9e0" />
      <group {...h}>
        <Box p={pos} s={[1.36, 0.82, 0.07]} c="#141414" r={0.35} />
        <mesh position={[pos[0], pos[1], pos[2] + 0.04]}>
          <planeGeometry args={[1.26, 0.72]} />
          <meshBasicMaterial ref={scr} map={tex} toneMapped={false} />
        </mesh>
        <Box p={[-1.3, F + 0.53, -5.62]} s={[0.35, 0.06, 0.2]} c="#141414" />
      </group>
      <pointLight position={[-1.3, F + 1.0, -5.0]} color="#cfe6ff" intensity={0.6} distance={2.5} decay={2} />
    </group>
  )
}

/* ───────── 소파 + 아빠 ───────── */
function SofaDad() {
  const bubble = useRef()
  const head = useRef()
  const chest = useRef()
  const near = useRef(false)
  const last = useRef('')
  const pos = [-2.8, F, -2.6]
  const say = () => {
    last.current = pick(DAD_LINES, last.current)
    bubble.current.say(last.current)
  }
  const h = useActor('dad', 'talk', '👨 소파에서 TV 보는 아빠', pos, say, 2.6)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const p = world.player
    const d = Math.hypot(p.x - pos[0], p.z - pos[2])
    if (d < 1.8 && !near.current) {
      near.current = true
      say()
    } else if (d > 2.8) near.current = false
    chest.current.scale.y = 1 + Math.sin(t * 1.6) * 0.012
    head.current.rotation.y = Math.sin(t * 0.3) * 0.12
  })
  const fabric = '#c9bca9'
  return (
    <group position={pos} rotation={[0, Math.PI - 0.55, 0]}>
      {/* 패브릭 소파 (로컬 +z 가 앞) */}
      <Box p={[0, 0.22, 0]} s={[1.8, 0.3, 0.85]} c="#b5a893" r={1} rad={0.08} />
      <Box p={[0, 0.42, 0.05]} s={[1.5, 0.16, 0.72]} c={fabric} r={1} rad={0.08} />
      <Box p={[0, 0.66, -0.34]} s={[1.6, 0.6, 0.24]} c={fabric} r={1} rad={0.1} />
      {[-0.82, 0.82].map((x) => (
        <Box key={x} p={[x, 0.48, 0]} s={[0.22, 0.38, 0.85]} c={fabric} r={1} rad={0.1} />
      ))}
      {[-0.7, 0.7].map((x) => (
        <Box key={'l' + x} p={[x, 0.04, 0.3]} s={[0.07, 0.1, 0.07]} c="#6b4429" />
      ))}
      <Sph p={[-0.55, 0.62, -0.2]} r={0.17} sc={[1, 1, 0.55]} c="#d9cfbf" />
      <group position={[0.2, -0.02, 0.0]} {...h}>
        <Dad headRef={head} chestRef={chest} />
        <SpeechBubble ref={bubble} y={1.6} />
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
  const pos = [-1.4, F + 0.4, -3.45]
  const h = useActor('phone', 'object', '☎️ 옛날 유선 전화기 (따르릉)', pos, () => {
    playSound('phone', () => audio.ring(), { dur: 3600, once: true, fade: 900 })
    shake.current = 1.6
    setTimeout(() => bubble.current?.say('여보세요~ 응, 엄마야! 밥은 먹었니?'), 1700)
  })
  return (
    <group>
      <Box p={[-1.4, F + 0.32, -3.45]} s={[0.95, 0.06, 0.62]} c="#7a4e2e" r={0.5} rad={0.03} />
      {[
        [-0.4, -0.25],
        [0.4, -0.25],
        [-0.4, 0.25],
        [0.4, 0.25],
      ].map(([x, z], i) => (
        <Box key={i} p={[-1.4 + x, F + 0.15, -3.45 + z]} s={[0.06, 0.3, 0.06]} c="#5a3a24" />
      ))}
      {/* 찻잔 + 책 */}
      <Cyl p={[-1.1, F + 0.39, -3.3]} r={0.05} rb={0.04} h={0.08} c="#f2eee6" />
      <Box p={[-1.75, F + 0.37, -3.55]} s={[0.3, 0.04, 0.22]} c="#e4d6bc" rad={0.01} />
      <group position={[-1.45, F + 0.35, -3.5]} rotation={[0, 0.5, 0]} {...h}>
        <Box p={[0, 0.05, 0]} s={[0.22, 0.1, 0.24]} c="#e8dcc4" r={0.4} />
        <Cyl p={[0, 0.105, 0.04]} r={0.065} h={0.012} c="#d2c8b2" />
        <group ref={handset} position={[0, 0.11, -0.06]}>
          <Box p={[0, 0.03, 0]} s={[0.22, 0.03, 0.045]} c="#e8dcc4" r={0.4} />
          <Box p={[-0.1, 0.0, 0]} s={[0.06, 0.05, 0.06]} c="#e8dcc4" r={0.4} />
          <Box p={[0.1, 0.0, 0]} s={[0.06, 0.05, 0.06]} c="#e8dcc4" r={0.4} />
        </group>
        <mesh geometry={cord}>
          <meshStandardMaterial color="#ddd0b6" roughness={0.6} />
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
  useFrame(() => {
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
    <group position={[0.15, 2.4, -5.88]}>
      <mesh rotation-x={Math.PI / 2} geometry={roundCylGeo(0.24, 0.24, 0.06, 32, 0.025)}>
        <meshStandardMaterial color="#5a3a24" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.032]}>
        <circleGeometry args={[0.2, 32]} />
        <meshBasicMaterial map={tex} />
      </mesh>
      {hand(h, 0.1, 0.016, '#2a1a10', 0.036)}
      {hand(m, 0.15, 0.011, '#2a1a10', 0.039)}
      {hand(s, 0.17, 0.005, '#a33a2b', 0.042)}
    </group>
  )
}

/* ───────── 장작 난로 + 양은 주전자 ───────── */
function StoveKettle() {
  const on = useStore((s) => s.kettleOn)
  const lid = useRef()
  const fire = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    lid.current.position.y = 0.21 + (on ? Math.abs(Math.sin(t * 18)) * 0.008 : 0)
    fire.current.material.emissiveIntensity = 1.6 + Math.sin(t * 7) * 0.3 + Math.sin(t * 13) * 0.2
  })
  const pos = [0.55, F + 0.82, -5.35]
  const h = useActor('kettle', 'object', '🫖 난로 위 양은 주전자 (물 끓이기)', pos, () => {
    playAmbient('kettle', 'kettle', 6500, 'kettleOn')
    showToast('🫖 주전자 물이 끓어요… 뿌우~')
  })
  return (
    <group>
      <group position={[0.55, F, -5.35]}>
        {/* 무쇠 몸통 */}
        <mesh position={[0, 0.42, 0]} geometry={roundBoxGeo(0.72, 0.56, 0.6, 0.06)}>
          <meshStandardMaterial color="#1f1e1d" roughness={0.55} metalness={0.4} />
        </mesh>
        <mesh ref={fire} position={[0, 0.4, 0.302]}>
          <planeGeometry args={[0.38, 0.26]} />
          <meshStandardMaterial color="#ff8a3a" emissive="#ff6a1a" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
        <Box p={[0, 0.4, 0.31]} s={[0.46, 0.34, 0.02]} c="#2a2826" m={0.4} />
        <Box p={[0, 0.72, 0]} s={[0.78, 0.05, 0.66]} c="#2a2826" m={0.4} />
        {[
          [-0.28, -0.22],
          [0.28, -0.22],
          [-0.28, 0.22],
          [0.28, 0.22],
        ].map(([x, z], i) => (
          <Cyl key={i} p={[x, 0.07, z]} r={0.035} h={0.14} c="#1f1e1d" />
        ))}
        {/* 연통 */}
        <Cyl p={[0.12, 1.85, -0.18]} r={0.075} h={2.3} c="#2a2826" />
        <pointLight position={[0, 0.45, 0.6]} color="#ff9a4a" intensity={1.6} distance={2.6} decay={2} />
      </group>
      <group position={pos} {...h}>
        <mesh geometry={roundCylGeo(0.13, 0.17, 0.2, 28, 0.05)}>
          <meshStandardMaterial color="#d6b25a" metalness={0.75} roughness={0.28} />
        </mesh>
        <group ref={lid}>
          <Cyl p={[0, 0, 0]} r={0.12} h={0.02} c="#cfa84e" />
          <Sph p={[0, 0.03, 0]} r={0.025} c="#2a1a10" />
        </group>
        <mesh position={[-0.19, 0.05, 0]} rotation={[0, 0, 0.9]}>
          <capsuleGeometry args={[0.025, 0.15, 4, 10]} />
          <meshStandardMaterial color="#d6b25a" metalness={0.75} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.17, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.11, 0.012, 6, 16, Math.PI]} />
          <meshStandardMaterial color="#2a1a10" />
        </mesh>
        <Steam on={on} p={[-0.27, 0.12, 0]} spread={0.06} rise={0.8} size={0.2} />
        <Steam on={on} p={[0, 0.22, 0]} n={4} spread={0.04} rise={0.6} size={0.15} />
        <SoundBadge id="kettle" p={[0, 0.62, 0]} />
      </group>
    </group>
  )
}

/* ───────── 러그 위 엎드린 갈색 푸들 ───────── */
const POODLE_LINES = ['낑~ 쓰담쓰담 해줘', '꼬리 살랑살랑~', '햇볕 너무 따뜻해…', '같이 낮잠 잘래?']
function Poodle() {
  const dog = useRef()
  const hearts = useRef()
  const bubble = useRef()
  const last = useRef('')
  const pos = [-0.3, F, -2.7]
  const act = () => {
    last.current = pick(POODLE_LINES, last.current)
    bubble.current.say(last.current, 3000)
    playSound(
      'poodle',
      () => {
        dog.current.wag(1.6)
        hearts.current.burst()
        audio.whine()
      },
      { dur: 5500, gap: [1700, 2300] }
    )
  }
  const h = useActor('poodle', 'talk', '🐩 러그 위 갈색 푸들', pos, act, 2.2)
  return (
    <group position={pos} rotation={[0, 0.5, 0]} {...h}>
      <Dog ref={dog} pose="lie" kind="poodle" color="#8a5634" light="#a56c45" size={0.85} />
      <Hearts ref={hearts} y={0.55} />
      <SpeechBubble ref={bubble} y={1.0} scale={0.8} />
      <SoundBadge id="poodle" p={[0, 0.72, 0.1]} />
    </group>
  )
}

/* ───────── 소품 · 조명 ───────── */
function Props() {
  return (
    <group>
      {/* 큰 화분 */}
      <mesh position={[-3.05, F + 0.22, -5.6]} geometry={roundCylGeo(0.22, 0.17, 0.44, 24, 0.04)}>
        <meshStandardMaterial color="#6e4a32" roughness={0.8} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Sph key={i} p={[-3.05 + Math.cos(i) * 0.22, F + 0.9 + (i % 3) * 0.25, -5.6 + Math.sin(i) * 0.18]} r={0.24} sc={[1, 0.8, 1]} c={i % 2 ? '#4f6e3a' : '#5d7d44'} />
      ))}
      <Cyl p={[-3.05, F + 0.7, -5.6]} r={0.03} h={0.6} c="#5a3a24" />
      {/* 스탠드 협탁 + 갓등 */}
      <Box p={[-3.72, F + 0.3, -4.05]} s={[0.5, 0.6, 0.5]} c="#5a3a24" r={0.6} />
      <Cyl p={[-3.72, F + 0.75, -4.05]} r={0.03} h={0.3} c="#c9a46a" />
      <mesh position={[-3.72, F + 0.98, -4.05]} geometry={roundCylGeo(0.12, 0.18, 0.22, 24, 0.02)}>
        <meshStandardMaterial color="#f5ead2" emissive="#ffcf8a" emissiveIntensity={0.9} roughness={0.9} />
      </mesh>
      <pointLight position={[-3.72, F + 0.95, -3.85]} color="#ffc778" intensity={1.4} distance={3.5} decay={2} />
      {/* 방석 */}
      <Box p={[-1.6, F + 0.04, 0.4]} s={[0.55, 0.08, 0.55]} c="#a5674a" r={1} rad={0.04} />
      <Box p={[-1.5, F + 0.11, 0.45]} s={[0.5, 0.06, 0.5]} c="#d4b483" r={1} rad={0.03} rot={[0, 0.3, 0]} />
      {/* 천장 형광등 */}
      <mesh position={[-1.3, 2.93, -2.4]} geometry={roundBoxGeo(1.9, 0.07, 0.22, 0.03)} userData={{ noCast: true }}>
        <meshStandardMaterial color="#ffffff" emissive="#fff6e6" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <pointLight position={[-1.3, 2.7, -2.4]} color="#fff1dc" intensity={2.2} distance={8} decay={1.6} />
      <pointLight position={[-1.2, 2.4, 1.5]} color="#ffe7c4" intensity={1.0} distance={6} decay={1.8} />
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
    </group>
  )
}
