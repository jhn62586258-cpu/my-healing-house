import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { world, useActor, useStore, showToast, playAmbient, FLOOR, MOM_LINES, S } from '../store'
import { Box, Cyl, Sph, roundCylGeo } from './parts'
import { SafeModel, Real } from './ModelKit'
import { ZoneGroup, KitchenMomSet, DiningSet } from './Sets'
import { Mom } from './Character'
import { SpeechBubble, Steam, SoundBadge } from './Fx'
import { pick } from './Living'

const F = FLOOR
const TOPY = F + 0.86
const CAB = '#7a5132'

/* ───────── (예전 낱개) 냉장고 + 부엌 조명 ───────── */
function Fridge() {
  return (
    <group>
      {/* 냉장고 (실제 크기, 싱크대 바로 왼쪽 벽에 붙임) */}
      <Real position={[1.95, F, -5.92]}>
        <Box p={[0, 0.88, 0.37]} s={[0.78, 1.76, 0.72]} c="#f1f0ec" r={0.35} rad={0.06} />
        <Box p={[0, 1.22, 0.735]} s={[0.74, 0.012, 0.01]} c="#cfcac2" />
        <Box p={[-0.33, 1.45, 0.74]} s={[0.03, 0.3, 0.04]} c="#bdb8ae" />
        <Box p={[-0.33, 0.75, 0.74]} s={[0.03, 0.3, 0.04]} c="#bdb8ae" />
        {[
          [0.1, 1.55, '#e7b04a'],
          [0.25, 1.4, '#7fa6c9'],
          [-0.05, 1.3, '#d9725c'],
        ].map(([x, y, c], i) => (
          <Box key={i} p={[x, y, 0.735]} s={[0.1, 0.08, 0.015]} c={c} />
        ))}
      </Real>
      {/* (예전 하얀 옆 조리대 도형은 제거) */}
    </group>
  )
}


function KitchenLights() {
  return (
    <group>
      {/* 부엌 펜던트 등 */}
      <Cyl p={[3.4, 2.85, -3.6]} r={0.006} h={0.45} c="#3a2a1a" />
      <mesh position={[3.4, 2.55, -3.6]} geometry={roundCylGeo(0.07, 0.17, 0.18, 24, 0.02)}>
        <meshStandardMaterial color="#f2e6cc" emissive="#ffd59a" emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
      <pointLight position={[3.4, 2.4, -3.6]} color="#ffd59a" intensity={2.4} distance={6} decay={1.7} />
      <pointLight position={[2.6, 2.4, 0.3]} color="#ffe2b8" intensity={1.6} distance={5} decay={1.7} />
      <pointLight position={[3.4, 2.5, -2.0]} color="#ffe8cc" intensity={1.4} distance={6} decay={1.7} />
    </group>
  )
}

/* ───────── 주방 싱크대/수납장 (kitchencabinet.glb) + 뚝배기 ───────── */
const CAB_POS = [3.8, F, -5.92]
function NorthCounterFallback() {
  // 원래 좌표 그대로 쓰기 위해 그룹 위치를 되돌림
  return (
    <group scale={S}>
    <group position={[-CAB_POS[0], -CAB_POS[1], -CAB_POS[2]]}>
      {/* 북쪽 조리대 */}
      <Box p={[3.87, F + 0.42, -5.68]} s={[2.62, 0.84, 0.64]} c={CAB} r={0.6} />
      {[2.9, 3.55, 4.2, 4.85].map((x) => (
        <group key={x}>
          <Box p={[x, F + 0.42, -5.355]} s={[0.6, 0.7, 0.02]} c="#8a5c39" r={0.55} />
          <Box p={[x + 0.22, F + 0.6, -5.34]} s={[0.03, 0.12, 0.02]} c="#c9b28a" m={0.4} />
        </group>
      ))}
      <Box p={[3.87, TOPY, -5.68]} s={[2.66, 0.04, 0.68]} c="#d8d2c6" r={0.35} />
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
    </group>
    </group>
  )
}
function Cabinet() {
  return (
    <SafeModel name="kitchencabinet" position={CAB_POS} fallback={<NorthCounterFallback />} defaults={{ anchors: { counter: 0.86, sink: 0.86 } }}>
      {(fit) => (
        <group position={[0.42, fit.anchors.counter ?? 0.86, 0.27]}>
          <Ttukbaegi />
        </group>
      )}
    </SafeModel>
  )
}

/* ───────── 식탁 · 의자 · 과일 바구니 ───────── */
function Dining() {
  const legs = [
    [-0.75, -0.42],
    [0.75, -0.42],
    [-0.75, 0.42],
    [0.75, 0.42],
  ]
  // 의자: 식탁 중심 기준 실제 거리(m)
  const chairs = [
    [-0.36, -0.68, 0],
    [0.36, -0.68, 0],
    [-0.36, 0.68, Math.PI],
    [0.36, 0.68, Math.PI],
  ]
  return (
    <group>
      <SafeModel
        name="diningtable"
        position={[2.6, F, 0.3]}
        defaults={{ anchors: { top: 0.755 } }}
        fallback={
          <group>
            <Box p={[0, 0.72, 0]} s={[1.7, 0.07, 1.0]} c="#7a4e2e" r={0.45} rad={0.03} />
            {legs.map(([x, z], i) => (
              <Box key={i} p={[x, 0.36, z]} s={[0.07, 0.72, 0.07]} c="#5a3a24" />
            ))}
          </group>
        }
      >
        {(fit) => (
          <SafeModel
            name="basket"
            position={[0.15, fit.anchors.top ?? 0.755, -0.05]}
            fallback={
              <group>
                <mesh position={[0, 0.07, 0]} geometry={roundCylGeo(0.26, 0.16, 0.14, 28, 0.03)}>
                  <meshStandardMaterial color="#8a5a34" roughness={0.6} />
                </mesh>
                {[
                  [0, 0.2, 0],
                  [0.12, 0.18, 0.07],
                  [-0.12, 0.18, 0.05],
                  [0.03, 0.18, -0.12],
                  [-0.06, 0.29, -0.02],
                  [0.08, 0.28, -0.04],
                ].map(([x, y, z], i) => (
                  <Sph key={i} p={[x, y, z]} r={0.07} sc={[1, 0.86, 1]} c="#e8752a" rough={0.45} />
                ))}
              </group>
            }
          />
        )}
      </SafeModel>
      <Real position={[2.6, F, 0.3]}>
      {chairs.map(([x, z, r], i) => (
        <SafeModel
          key={i}
          name="diningchair"
          position={[x, 0, z]}
          rotation-y={r}
          fallback={
            <group>
              <Box p={[0, 0.45, 0]} s={[0.44, 0.05, 0.42]} c="#7a4e2e" rad={0.02} />
              <Box p={[0, 0.78, -0.2]} s={[0.44, 0.5, 0.04]} c="#7a4e2e" rad={0.02} />
              {legs.map(([a, b], k) => (
                <Box key={k} p={[a * 0.24, 0.22, b * 0.4]} s={[0.04, 0.44, 0.04]} c="#5a3a24" />
              ))}
            </group>
          }
        />
      ))}
      </Real>
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
    if (!flame.current || !surf.current) return
    flame.current.visible = on
    flame.current.scale.y = 1 + Math.sin(t * 20) * 0.15
    surf.current.position.y = 0.14 + (on ? Math.sin(t * 9) * 0.006 : 0)
  })
  const pos = [4.27, TOPY + 0.1, -5.62]
  const h = useActor('stew', 'object', '🍲 된장찌개 뚝배기 (보글보글)', pos, () => {
    playAmbient('stew', 'stew', 6500, 'stewOn')
    showToast('🍲 된장찌개가 보글보글 끓어요')
  })
  return (
    <group>
      <group ref={flame} position={[0, 0.0, 0]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[Math.cos(i) * 0.08, 0.02, Math.sin(i) * 0.08]}>
            <coneGeometry args={[0.018, 0.05, 6]} />
            <meshStandardMaterial color="#5aa0ff" emissive="#3a7bff" emissiveIntensity={2} toneMapped={false} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
      <group position={[0, 0.09, 0]} {...h}>
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
  const sway = useRef()
  const bubble = useRef()
  const talk = useRef(0)
  const last = useRef('')
  const base = [3.65, F, -4.85]
  const say = () => {
    last.current = pick(MOM_LINES, last.current)
    bubble.current?.say(last.current)
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
    if (arm.current) {
      arm.current.rotation.x = -0.9 + (talk.current > 0 ? Math.sin(t * 8) * 0.25 - 0.5 : Math.sin(t * 3) * 0.12)
      arm.current.rotation.y = talk.current > 0 ? 0 : Math.cos(t * 3) * 0.25
    }
    if (head.current) head.current.rotation.z = Math.sin(t * 1.4) * 0.05
    // 모델 전체: 찌개 젓는 듯 살랑살랑 + 말할 때 통통
    if (sway.current) {
      sway.current.rotation.z = Math.sin(t * 3) * 0.025
      sway.current.position.y = talk.current > 0 ? Math.abs(Math.sin(t * 9)) * 0.03 : 0
    }
  })
  return (
    <group ref={g} position={base} rotation={[0, Math.PI, 0]} {...h}>
      <group ref={sway}>
        <SafeModel name="mom" fallback={<Mom armRef={arm} headRef={head} />}>
          {(fit) => <SpeechBubble ref={bubble} y={(fit.loaded ? fit.h : 1.3) + 0.4} />}
        </SafeModel>
      </group>
    </group>
  )
}

export default function Kitchen() {
  return (
    <group>
      <ZoneGroup zone="house">
        <KitchenMomSet
          legacy={
            <>
              <Fridge />
              <Cabinet />
              <MomAtStove />
            </>
          }
        />
        <DiningSet legacy={<Dining />} />
      </ZoneGroup>
      <KitchenLights />
    </group>
  )
}
