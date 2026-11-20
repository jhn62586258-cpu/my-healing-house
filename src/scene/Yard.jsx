import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useActor, moveTo, openLetter, showToast, playSound } from '../store'
import * as audio from '../audio/AsmrEngine'
import { grassTex, plaid, stoneWall } from './textures'
import { Box, Cyl, Sph, Cap, Rod, roundBoxGeo, roundCylGeo } from './parts'
import { Dog } from './Dogs'
import { SpeechBubble, Hearts, SoundBadge } from './Fx'
import { Real } from './ModelKit'
import { ZoneGroup, PyeongsangSet, DoghouseSet, PersimmonTreeSet, MailboxSet } from './Sets'
import { pick } from './Living'

const BASE = { x0: -12.6, x1: 9.6, z0: -10.4, z1: 7.4 }

function roundRectShape(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/* ───────── 미니어처 받침 + 잔디 + 디딤돌 ───────── */
function Ground() {
  const grass = useMemo(() => grassTex(), [])
  const W = BASE.x1 - BASE.x0
  const D = BASE.z1 - BASE.z0
  const cx = (BASE.x0 + BASE.x1) / 2
  const cz = (BASE.z0 + BASE.z1) / 2
  const top = useMemo(() => {
    const g = new THREE.ShapeGeometry(roundRectShape(W - 0.3, D - 0.3, 0.5), 8)
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3)
    return g
  }, [W, D])
  const stones = useMemo(() => {
    const out = []
    const a = [-7.85, 6.2]
    const b = [-5.0, 1.3]
    for (let i = 0; i <= 6; i++) {
      const u = i / 6
      out.push([a[0] + (b[0] - a[0]) * u + Math.sin(i * 1.7) * 0.15, a[1] + (b[1] - a[1]) * u, 0.24 + (i % 3) * 0.03])
    }
    return out
  }, [])
  return (
    <group>
      <mesh position={[cx, -0.6, cz]} geometry={roundBoxGeo(W, 1.2, D, 0.35)} onClick={moveTo}>
        <meshStandardMaterial color="#7a5a3e" roughness={1} />
      </mesh>
      <mesh geometry={top} rotation-x={-Math.PI / 2} position={[cx, 0.004, cz]} onClick={moveTo}>
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      {stones.map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.03, z]} scale={[1, 0.22, 0.8]} onClick={moveTo}>
          <sphereGeometry args={[r * 1.4, 18, 10]} />
          <meshStandardMaterial color={i % 2 ? '#b3ada3' : '#a29c92'} roughness={0.9} />
        </mesh>
      ))}
      {/* 창고채 앞 시멘트 */}
      <mesh position={[-9.6, 0.02, -6.0]} geometry={roundBoxGeo(4.0, 0.04, 0.9, 0.02)} onClick={moveTo}>
        <meshStandardMaterial color="#c4bfb5" roughness={0.7} />
      </mesh>
      {useMemo(
        () =>
          Array.from({ length: 26 }, (_, i) => {
            const x = -11 + Math.random() * 3.6
            const z = -5 + Math.random() * 10
            return (
              <mesh key={i} position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, Math.random() * 6]} raycast={() => null} userData={{ noCast: true }}>
                <circleGeometry args={[0.06, 6]} />
                <meshStandardMaterial color={['#b5642a', '#9a4e22', '#c98a3a'][i % 3]} roughness={1} />
              </mesh>
            )
          }),
        []
      )}
    </group>
  )
}

/* ───────── 돌담 + 대문 기둥 + 뒤뜰 나무 ───────── */
function Walls() {
  const tex = useMemo(() => stoneWall(), [])
  const seg = (x0, x1, z0, z1, k) => (
    <mesh key={k} position={[(x0 + x1) / 2, 0.42, (z0 + z1) / 2]} geometry={roundBoxGeo(x1 - x0, 0.84, z1 - z0, 0.12)}>
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  )
  return (
    <group>
      {seg(-11.9, -11.45, -6.4, 6.9, 'w')}
      {seg(-11.9, -8.6, 6.5, 6.9, 's1')}
      {seg(-7.1, -3.9, 6.5, 6.9, 's2')}
      {seg(-4.15, -3.75, 4.4, 6.9, 'e')}
      {[-8.6, -7.1].map((x) => (
        <group key={x}>
          <Box p={[x, 0.6, 6.7]} s={[0.36, 1.2, 0.46]} c="#8f8a80" rad={0.06} />
          <Box p={[x, 1.24, 6.7]} s={[0.44, 0.08, 0.54]} c="#6d6860" rad={0.03} />
        </group>
      ))}
      {/* 뒤편 소나무·덤불 */}
      {[
        [-12.0, -9.8],
        [-10.3, -10.0],
        [-2.5, -8.0],
        [0.5, -8.2],
        [3.5, -7.8],
        [7.2, -6.0],
        [8.8, -8.6],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Cyl p={[0, 1.0, 0]} r={0.15} h={2} c="#5a4232" />
          <Sph p={[0, 2.4, 0]} r={1.1} sc={[1, 1.1, 1]} c="#3f5f32" />
          <Sph p={[0.2, 3.3, 0.1]} r={0.75} c="#466a37" />
        </group>
      ))}
      {[
        [-3.6, 6.0],
        [-0.5, 5.9],
        [2.5, 6.0],
        [5.5, 5.4],
        [8.2, 4.4],
        [9.0, 0.5],
      ].map(([x, z], i) => (
        <Sph key={'b' + i} p={[x, 0.42, z]} r={0.6 + (i % 2) * 0.15} sc={[1.2, 0.8, 1]} c={i % 2 ? '#56793d' : '#4d7036'} />
      ))}
    </group>
  )
}

/* ───────── 꽃밭 · 텃밭 ───────── */
const FLOWER = ['#e98aa0', '#f2c94c', '#b49ad9', '#f7f3ea', '#ee9a6a']
function FlowerBed({ x0, x1, z0, z1, seed = 1 }) {
  const items = useMemo(() => {
    let k = seed
    const rnd = () => ((k = (k * 9301 + 49297) % 233280) / 233280)
    const n = Math.round((x1 - x0) * (z1 - z0) * 13)
    return Array.from({ length: n }, (_, i) => [x0 + 0.1 + rnd() * (x1 - x0 - 0.2), z0 + 0.1 + rnd() * (z1 - z0 - 0.2), 0.2 + rnd() * 0.22, FLOWER[i % FLOWER.length]])
  }, [x0, x1, z0, z1, seed])
  return (
    <group>
      <Box p={[(x0 + x1) / 2, 0.07, (z0 + z1) / 2]} s={[x1 - x0, 0.16, z1 - z0]} c="#6a4a32" rad={0.06} />
      {items.map(([x, z, h, c], i) => (
        <group key={i} position={[x, 0.12, z]}>
          <mesh position={[0, h / 2, 0]}>
            <capsuleGeometry args={[0.012, h, 3, 6]} />
            <meshStandardMaterial color="#4f7a34" />
          </mesh>
          <mesh position={[0, h + 0.03, 0]} scale={[1, 0.75, 1]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color={c} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
function Veggie() {
  return (
    <group>
      <Box p={[-10.25, 0.12, 3.5]} s={[1.9, 0.24, 2.2]} c="#8a6a4a" rad={0.08} />
      <Box p={[-10.25, 0.2, 3.5]} s={[1.75, 0.08, 2.05]} c="#5a3e2a" rad={0.04} />
      {[2.8, 3.4, 4.0].map((z, i) => (
        <group key={i}>
          {[-10.75, -10.25].map((x, k) => (
            <group key={k} position={[x, 0.3, z]}>
              <Sph p={[0, 0.05, 0]} r={0.13} sc={[1, 0.85, 1]} c="#a6c97a" />
              {[0, 1, 2, 3].map((q) => (
                <Sph key={q} p={[Math.cos(q * 1.57) * 0.1, 0.02, Math.sin(q * 1.57) * 0.1]} r={0.1} sc={[1, 0.5, 1]} c="#6f9a45" />
              ))}
            </group>
          ))}
          {[-9.8, -9.65].map((x) => (
            <Cap key={x} p={[x, 0.45, z]} r={0.022} len={0.3} c="#5f9a40" />
          ))}
        </group>
      ))}
    </group>
  )
}

/* ───────── 평상 (홍시 한 접시 · 앉기 가능) ───────── */
function Pyeongsang() {
  const hearts = useRef()
  const pos = [-8.25, 0.45, 3.4]
  const h = useActor('persimmon', 'object', '🍊 평상 위 말랑 홍시', pos, () => {
    hearts.current.burst()
    playSound('persimmon', () => audio.squish(), { dur: 2500, once: true, fade: 800 })
    showToast('🍊 말랑말랑 홍시 하나 냠냠~ 달다!')
  })
  return (
    <group>
      <Box p={[-8.25, 0.38, 3.4]} s={[1.6, 0.1, 1.3]} c="#a47a4e" rad={0.04} />
      {[-0.6, -0.3, 0, 0.3, 0.6].map((dx) => (
        <Box key={dx} p={[-8.25 + dx, 0.435, 3.4]} s={[0.28, 0.02, 1.25]} c="#b88a5a" rad={0.01} />
      ))}
      {[
        [-0.7, -0.55],
        [0.7, -0.55],
        [-0.7, 0.55],
        [0.7, 0.55],
      ].map(([dx, dz], i) => (
        <Cyl key={i} p={[-8.25 + dx, 0.17, 3.4 + dz]} r={0.06} h={0.34} c="#7a5434" />
      ))}
      <Box p={[-8.7, 0.48, 3.0]} s={[0.45, 0.07, 0.45]} c="#b0574a" rad={0.03} />
      <group position={[-7.95, 0.46, 3.75]} {...h}>
        <Cyl p={[0, 0.02, 0]} r={0.22} rb={0.16} h={0.05} c="#efe9de" />
        {[
          [0, 0.09, 0],
          [0.09, 0.08, 0.06],
          [-0.09, 0.08, 0.05],
          [0.02, 0.08, -0.09],
        ].map((p, i) => (
          <group key={i} position={p}>
            <Sph p={[0, 0, 0]} r={0.065} sc={[1, 0.85, 1]} c="#e8752a" rough={0.45} />
            <Sph p={[0, 0.055, 0]} r={0.03} sc={[1.2, 0.4, 1.2]} c="#4f7a34" />
          </group>
        ))}
        <Hearts ref={hearts} y={0.3} ch="🧡" />
      </group>
    </group>
  )
}

/* ───────── 빨간 우체통 → 엄마의 편지 ───────── */
function Mailbox() {
  const flag = useRef()
  const kick = useRef(0)
  useFrame(({ clock }, dt) => {
    kick.current = Math.max(0, kick.current - dt * 2)
    flag.current.rotation.x = -kick.current * 1.2 + Math.sin(clock.elapsedTime * 2) * 0.03
  })
  const pos = [-6.85, 0, 5.95]
  const h = useActor('mailbox', 'object', '📮 빨간 우체통 (엄마의 편지)', pos, () => {
    kick.current = 1
    audio.paper()
    openLetter()
  })
  return (
    <group position={pos} rotation-y={Math.PI / 2} {...h}>
      <Cyl p={[0, 0.5, 0]} r={0.05} h={1.0} c="#5a4636" />
      <group position={[0, 1.15, 0]}>
        <Box p={[0, 0, 0]} s={[0.42, 0.32, 0.55]} c="#b8352b" r={0.45} rad={0.05} />
        <mesh position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.21, 0.21, 0.55, 16, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#b8352b" roughness={0.45} side={THREE.DoubleSide} />
        </mesh>
        <group ref={flag} position={[0.22, 0.05, 0.12]}>
          <Box p={[0.01, 0.15, 0]} s={[0.02, 0.3, 0.03]} c="#e8b923" />
          <Box p={[0.01, 0.27, -0.06]} s={[0.02, 0.08, 0.12]} c="#e8b923" />
        </group>
        <Box p={[0, 0.1, -0.3]} s={[0.18, 0.12, 0.02]} c="#f6ecd6" rot={[0.2, 0, 0]} />
      </group>
    </group>
  )
}

/* ───────── 파란 지붕 개집 + 누렁이 ───────── */
const NUREONG_LINES = ['멍멍! 산책 가자!', '멍! 간식 있어?', '왈왈~ 반가워!']
function DoghouseNureongi() {
  const dog = useRef()
  const bubble = useRef()
  const last = useRef('')
  const pos = [-9.2, 0, -4.9]
  const act = () => {
    last.current = pick(NUREONG_LINES, last.current)
    bubble.current.say(last.current, 2600)
    playSound(
      'nureongi',
      () => {
        dog.current.wag(1.5)
        audio.bark(1.15, 2)
      },
      { dur: 5500, gap: [1800, 2500] }
    )
  }
  const h = useActor('nureongi', 'talk', '🐕 개집 옆 누렁이', pos, act)
  return (
    <group>
      <group position={[-10.3, 0, -5.5]} rotation={[0, Math.PI / 2, 0]}>
        <Box p={[0, 0.36, 0]} s={[1.0, 0.72, 1.05]} c="#2b2b2d" rad={0.08} />
        <mesh position={[0, 0.32, 0.53]} scale={[1, 1.15, 1]}>
          <circleGeometry args={[0.22, 24]} />
          <meshStandardMaterial color="#0e0e0e" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.27, 0.9, 0]} rotation={[0, 0, -s * 0.62]} geometry={roundBoxGeo(0.7, 0.1, 1.25, 0.04)}>
            <meshStandardMaterial color="#2f6fc0" roughness={0.5} />
          </mesh>
        ))}
      </group>
      <Cyl p={[-9.6, 0.05, -4.3]} r={0.12} rb={0.1} h={0.08} c="#c9cdd0" />
      <Cyl p={[-9.25, 0.05, -4.25]} r={0.12} rb={0.1} h={0.08} c="#c9cdd0" />
      <group position={pos} rotation={[0, 1.9, 0]} {...h}>
        <Real>
          <Dog ref={dog} pose="stand" kind="jindo" color="#c79a5c" light="#e2c28e" size={0.95} leash />
          <SpeechBubble ref={bubble} y={1.3} scale={0.8} />
          <SoundBadge id="nureongi" p={[0, 1.0, 0]} />
        </Real>
      </group>
      <Rod a={[-9.05, 0.5, -4.85]} b={[-9.8, 0.06, -5.2]} r={0.012} c="#b8352b" />
    </group>
  )
}

/* ───────── 빨간 고무 다라이 + 고무 화분 ───────── */
function RubberTubs() {
  const red = '#b8452f'
  return (
    <group>
      <group position={[-9.6, 0, -5.6]}>
        <mesh position={[0, 0.17, 0]} geometry={roundCylGeo(0.46, 0.38, 0.34, 28, 0.05)}>
          <meshStandardMaterial color={red} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.34, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.45, 0.035, 10, 28]} />
          <meshStandardMaterial color={red} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.335, 0]} rotation-x={-Math.PI / 2} userData={{ noCast: true }}>
          <circleGeometry args={[0.42, 28]} />
          <meshStandardMaterial color="#6f8f9a" roughness={0.1} metalness={0.3} />
        </mesh>
      </group>
      {[
        [-7.4, -2.0, 0.22],
        [-7.35, 3.5, 0.25],
        [-4.6, -5.6, 0.2],
      ].map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, r * 0.85, 0]} geometry={roundCylGeo(r, r * 0.75, r * 1.7, 22, 0.03)}>
            <meshStandardMaterial color="#a8432e" roughness={0.7} />
          </mesh>
          <Sph p={[0, r * 1.8, 0]} r={r * 0.9} sc={[1, 0.7, 1]} c="#4f7a34" />
        </group>
      ))}
    </group>
  )
}

/* ───────── 장독대 ───────── */
function Onggi({ p, s = 1 }) {
  const geo = useMemo(() => {
    const pts = [
      [0.0, 0],
      [0.18, 0],
      [0.26, 0.12],
      [0.32, 0.32],
      [0.31, 0.48],
      [0.22, 0.6],
      [0.19, 0.64],
      [0.2, 0.67],
      [0.0, 0.67],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 28)
  }, [])
  return (
    <group position={p} scale={s}>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#3e2a20" roughness={0.22} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.7, 0]} scale={[1, 0.35, 1]}>
        <sphereGeometry args={[0.22, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#35241b" roughness={0.3} />
      </mesh>
    </group>
  )
}
function Jangdokdae() {
  return (
    <group>
      <Box p={[-10.63, 0.13, -1.0]} s={[1.35, 0.26, 3.8]} c="#9a958b" rad={0.08} />
      {[
        [-10.85, -2.4, 1.05],
        [-10.4, -1.7, 0.85],
        [-10.85, -0.9, 1.2],
        [-10.35, -0.2, 0.75],
        [-10.8, 0.45, 0.9],
      ].map(([x, z, s], i) => (
        <Onggi key={i} p={[x, 0.26, z]} s={s} />
      ))}
    </group>
  )
}

/* ───────── 감나무 + 백구 + 낙엽 다람쥐 ───────── */
function PersimmonTree() {
  const leaves = useMemo(() => {
    let k = 3
    const rnd = () => ((k = (k * 9301 + 49297) % 233280) / 233280)
    return Array.from({ length: 26 }, (_, i) => {
      const a = rnd() * Math.PI * 2
      const r = 0.4 + rnd() * 1.5
      return [Math.cos(a) * r, 2.5 + rnd() * 1.6, Math.sin(a) * r, 0.55 + rnd() * 0.35, i]
    })
  }, [])
  const fruits = useMemo(() => leaves.slice(0, 22).map(([x, y, z, s]) => [x * 1.25, y - s * 0.45, z * 1.25]), [leaves])
  const crown = useRef()
  useFrame(({ clock }) => {
    crown.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.012
  })
  return (
    <group position={[-8.6, 0, -2.6]}>
      <Cyl p={[0, 1.0, 0]} r={0.17} rb={0.26} h={2.0} c="#4e3a2c" />
      <group ref={crown}>
        <Rod a={[0, 1.8, 0]} b={[-0.9, 2.8, 0.5]} r={0.09} c="#4e3a2c" />
        <Rod a={[0, 1.8, 0]} b={[0.8, 2.9, -0.4]} r={0.09} c="#4e3a2c" />
        {leaves.map(([x, y, z, s, i]) => (
          <Sph key={i} p={[x, y, z]} r={s} sc={[1, 0.8, 1]} c={i % 3 ? '#3f6a2e' : '#4c7a36'} seg={14} />
        ))}
        {fruits.map((p, i) => (
          <Sph key={'f' + i} p={p} r={0.09} c="#e8702a" seg={12} rough={0.45} />
        ))}
      </group>
    </group>
  )
}

const BAEKGU_LINES = ['멍! 반가워!', '멍멍~ 같이 놀자!', '킁킁… 맛있는 냄새!']
function Baekgu() {
  const dog = useRef()
  const bubble = useRef()
  const last = useRef('')
  const pos = [-9.2, 0, -1.0]
  const act = () => {
    last.current = pick(BAEKGU_LINES, last.current)
    bubble.current.say(last.current, 2600)
    playSound(
      'baekgu',
      () => {
        dog.current.wag(1.5)
        audio.bark(1.0, 1)
      },
      { dur: 5500, gap: [1700, 2400] }
    )
  }
  const h = useActor('baekgu', 'talk', '🐶 감나무 아래 하얀 백구', pos, act)
  return (
    <group position={pos} rotation={[0, 1.3, 0]} {...h}>
      <Real>
        <Dog ref={dog} pose="sit" kind="jindo" color="#f3efe6" light="#fbf8f2" size={1.0} leash />
        <SpeechBubble ref={bubble} y={1.4} scale={0.8} />
        <SoundBadge id="baekgu" p={[0, 1.12, 0]} />
      </Real>
    </group>
  )
}

function SquirrelLeaves() {
  const sq = useRef()
  const pile = useRef()
  const hop = useRef(0)
  const leafs = useMemo(
    () =>
      Array.from({ length: 45 }, (_, i) => {
        const a = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.random()) * 0.45
        return [Math.cos(a) * r, 0.02 + (0.45 - r) * 0.35 * Math.random(), Math.sin(a) * r, Math.random() * 6, ['#b5642a', '#9a4e22', '#c98a3a', '#8a4a22'][i % 4]]
      }),
    []
  )
  useFrame(({ clock }, dt) => {
    hop.current = Math.max(0, hop.current - dt * 1.2)
    const h = hop.current
    sq.current.position.y = 0.05 + Math.abs(Math.sin(h * Math.PI * 3)) * 0.35 * h
    sq.current.rotation.y = -0.6 + Math.sin(clock.elapsedTime * 0.8) * 0.3 + h * 6
    pile.current.rotation.y = Math.sin(clock.elapsedTime * 25) * 0.04 * h
  })
  const pos = [-7.9, 0, -4.2]
  const h = useActor('leaves', 'object', '🐿️ 낙엽 더미와 다람쥐 (바스락)', pos, () =>
    playSound(
      'leaves',
      () => {
        hop.current = 1
        audio.leaves(1.6)
        if (Math.random() < 0.6) setTimeout(() => audio.squirrel(), 300)
      },
      { dur: 6000, gap: [1500, 1900] }
    )
  )
  return (
    <group position={pos} {...h}>
      <group ref={pile}>
        {leafs.map(([x, y, z, r, c], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[-Math.PI / 2 + (i % 5) * 0.2, 0, r]}>
            <circleGeometry args={[0.07, 5]} />
            <meshStandardMaterial color={c} roughness={1} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      <group ref={sq} position={[0.4, 0.05, 0.2]}>
        <Sph p={[0, 0.15, 0]} r={0.1} sc={[0.9, 1.1, 1.2]} c="#8a5a34" />
        <Sph p={[0, 0.3, 0.08]} r={0.07} c="#8a5a34" />
        <Sph p={[0, 0.27, 0.14]} r={0.025} c="#efe0c8" />
        <Sph p={[-0.035, 0.37, 0.07]} r={0.02} c="#8a5a34" />
        <Sph p={[0.035, 0.37, 0.07]} r={0.02} c="#8a5a34" />
        <Sph p={[0, 0.27, -0.15]} r={0.09} sc={[0.8, 1.6, 0.8]} c="#a26a3c" />
        <Sph p={[0.02, 0.31, 0.13]} r={0.014} c="#111" raw />
      </group>
      <SoundBadge id="leaves" p={[0, 0.85, 0]} />
    </group>
  )
}

/* ───────── 처마 빨랫줄 (분홍 수건 · 체크 담요 · 흰 수건 · 파란 수건) ───────── */
function Laundry() {
  const items = useRef([])
  const blanket = useMemo(() => plaid('#9b2b26', '#efe4cf', '#2a1a18', [2, 2]), [])
  const list = [
    { z: -5.2, w: 0.6, h: 0.72, c: '#e98a86' },
    { z: -4.2, w: 1.05, h: 1.05, map: blanket },
    { z: -3.3, w: 0.5, h: 0.62, c: '#f2f0ea' },
    { z: -2.75, w: 0.5, h: 0.58, c: '#3157a8' },
  ]
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    items.current.forEach((m, i) => m && (m.rotation.z = Math.sin(t * 1.3 + i) * 0.06))
  })
  const Y = 2.5
  const X = -5.5
  return (
    <group>
      <Rod a={[X, Y, -5.7]} b={[X, Y, -2.3]} r={0.008} c="#dddddd" />
      {list.map((it, i) => (
        <group key={i} ref={(el) => (items.current[i] = el)} position={[X, Y, it.z]}>
          <mesh position={[0, -it.h / 2, 0]} rotation-y={Math.PI / 2} raycast={() => null} geometry={roundBoxGeo(it.w, it.h, 0.035, 0.015)}>
            <meshStandardMaterial color={it.map ? '#ffffff' : it.c} map={it.map} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ───────── 처마 풍경 ───────── */
function WindBell() {
  const g = useRef()
  const swing = useRef(0)
  useFrame(({ clock }, dt) => {
    swing.current = Math.max(0, swing.current - dt * 0.6)
    const t = clock.elapsedTime
    g.current.rotation.z = Math.sin(t * 1.4) * 0.06 + Math.sin(t * 9) * swing.current * 0.5
    g.current.rotation.x = Math.sin(t * 7) * swing.current * 0.3
  })
  const pos = [-7.3, 0, -1.2]
  const h = useActor('windbell', 'object', '🎐 처마 끝 풍경 (땡그랑)', pos, () =>
    playSound(
      'windbell',
      () => {
        swing.current = 1
        audio.windBell()
      },
      { dur: 6500, gap: [2000, 2600] }
    ), 2.6)
  return (
    <group position={[-7.3, 2.55, -1.2]}>
      <group ref={g} {...h}>
        <Cyl p={[0, -0.12, 0]} r={0.006} h={0.24} c="#555" />
        <mesh position={[0, -0.32, 0]}>
          <cylinderGeometry args={[0.05, 0.11, 0.18, 16, 1, true]} />
          <meshStandardMaterial color="#7a6a3e" metalness={0.75} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
        <Sph p={[0, -0.25, 0]} r={0.05} sc={[1, 0.6, 1]} c="#7a6a3e" />
        <Cyl p={[0, -0.47, 0]} r={0.005} h={0.25} c="#555" />
        <mesh position={[0, -0.66, 0]}>
          <capsuleGeometry args={[0.05, 0.08, 4, 10]} />
          <meshStandardMaterial color="#3a6ab5" />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.45, 0.9, 0.45]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <SoundBadge id="windbell" p={[0, -1.1, 0.35]} size={0.26} />
    </group>
  )
}

/* ───────── 초록 철제 기둥 ───────── */
function EavePosts() {
  return (
    <group>
      {[-5.7, -2.6, -0.2, 3.0].map((z) => (
        <Cyl key={z} p={[-7.1, 1.29, z]} r={0.045} h={2.58} c="#2f7d55" raw />
      ))}
      <Cyl p={[-7.62, 1.3, 4.5]} r={0.05} h={2.5} c="#a8673a" raw />
    </group>
  )
}

/* ───────── 뒷산 능선 ───────── */
function Mountains() {
  const hills = [
    [-30, -36, 26, 15, 12, '#4d6a3e'],
    [-6, -44, 28, 20, 12, '#46623a'],
    [20, -40, 24, 15, 11, '#557146'],
    [-44, -6, 16, 10, 22, '#5d7a4a'],
  ]
  return (
    <group>
      {hills.map(([x, z, r, h, d, c], i) => (
        <mesh key={i} position={[x, -3, z]} scale={[r, h, d]} raycast={() => null} userData={{ noCast: true }}>
          <sphereGeometry args={[1, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={c} roughness={1} />
        </mesh>
      ))}
      <mesh position={[-4, 14.5, -44]} scale={[3.4, 2.6, 2.6]} raycast={() => null} userData={{ noCast: true }}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#9c998f" roughness={1} />
      </mesh>
    </group>
  )
}

export default function Yard() {
  return (
    <group>
      <Ground />
      <Walls />
      <FlowerBed x0={-11.4} x1={-8.7} z0={5.55} z1={6.35} seed={3} />
      <FlowerBed x0={-6.45} x1={-4.1} z0={5.55} z1={6.35} seed={7} />
      {/* 텃밭은 감나무 세트 자리를 비켜 장독대 옆으로 */}
      <group position={[-0.05, 0, -1.55]}>
        <Veggie />
      </group>
      {/* 앞마당 세트 (구역: 앞마당) — 세트 파일이 없으면 예전 도형을 같은 자리로 옮겨서 대체 */}
      <ZoneGroup zone="yard">
        <PyeongsangSet
          legacy={
            <group position={[2.4, 0, -6.75]}>
              <Pyeongsang />
            </group>
          }
        />
        <DoghouseSet
          legacy={
            <group position={[3.9, 0, -0.1]}>
              <DoghouseNureongi />
            </group>
          }
        />
        <PersimmonTreeSet
          legacy={
            <group position={[-0.2, 0, 5.7]}>
              <PersimmonTree />
              <Baekgu />
            </group>
          }
        />
        <MailboxSet legacy={<Mailbox />} />
      </ZoneGroup>
      <RubberTubs />
      <Jangdokdae />
      <SquirrelLeaves />
      <Laundry />
      <WindBell />
      <EavePosts />
      <Mountains />
    </group>
  )
}
