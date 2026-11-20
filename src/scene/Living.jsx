import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world, useActor, moveTo, useStore, showToast, playSound, playAmbient, FLOOR, DAD_LINES, S } from '../store'
import * as audio from '../audio/AsmrEngine'
import { rugTex, clockFace, tvScreen } from './textures'
import { Box, Cyl, Sph, roundBoxGeo, roundCylGeo } from './parts'
import { SafeModel, Real, MODELS } from './ModelKit'
import { ZoneGroup, LivingSofaSet, TvStoveSet } from './Sets'
import { Dad } from './Character'
import { Dog } from './Dogs'
import { SpeechBubble, Hearts, Steam, SoundBadge } from './Fx'

const F = FLOOR
const CEIL = (2.95 - FLOOR) * S // 바닥~천장 실제 높이(m)
const WOOD = '#6b4429'
export const pick = (arr, prev) => {
  let s = arr[Math.floor(Math.random() * arr.length)]
  if (s === prev && arr.length > 1) s = arr[(arr.indexOf(s) + 1) % arr.length]
  return s
}

/* ───────── 러그 (rug.glb) ───────── */
function Rug() {
  const tex = useMemo(() => rugTex(), [])
  return (
    <group onClick={moveTo}>
      <SafeModel
        name="rug"
        position={[-0.75, F + 0.003, -3.4]}
        fallback={
          <mesh position={[0, 0.005, 0]} rotation-x={-Math.PI / 2} userData={{ noCast: true }}>
            <planeGeometry args={[3.0, 2.4]} />
            <meshStandardMaterial map={tex} roughness={1} />
          </mesh>
        }
      />
    </group>
  )
}

/* ───────── TV 장식장 (console.glb) + TV ───────── */
function TV() {
  const scr = useRef()
  const flash = useRef(0)
  const tex = useMemo(() => tvScreen(), [])
  useFrame(({ clock }, dt) => {
    flash.current = Math.max(0, flash.current - dt * 3)
    if (scr.current) scr.current.color.setScalar(flash.current > 0 ? 1.6 : 0.95 + Math.sin(clock.elapsedTime * 3) * 0.03)
  })
  const pos = [-1.3, F + 0.95, -5.6]
  const h = useActor('tv', 'object', '📺 켜져 있는 TV (채널 돌리기)', pos, () => {
    flash.current = 0.4
    audio.tvStatic()
    showToast('📺 아빠: "어, 그거 보던 건데~"')
  })
  return (
    <SafeModel
      name="console"
      position={[-1.3, F, -5.92]}
      defaults={{ d: 0.55, anchors: { top: 0.5 } }}
      fallback={
        <group>
          <Box p={[0, 0.25, 0.28]} s={[2.4, 0.5, 0.55]} c="#5a3a24" r={0.6} />
          {[-0.7, 0.7].map((x) => (
            <Box key={x} p={[x, 0.27, 0.56]} s={[0.6, 0.3, 0.02]} c="#4a2e1c" />
          ))}
        </group>
      }
    >
      {(fit) => {
        const y = fit.anchors.top ?? 0.5
        const z = Math.min(0.3, (fit.d ?? 0.55) * 0.5)
        return (
          <group position={[0, y, z]}>
            <Cyl p={[0.9, 0.05, 0]} r={0.09} rb={0.08} h={0.1} c="#efe9e0" />
            <group {...h}>
              <Box p={[0, 0.03, 0]} s={[0.35, 0.06, 0.2]} c="#141414" />
              <Cyl p={[0, 0.08, 0]} r={0.03} h={0.08} c="#141414" />
              <Box p={[0, 0.5, 0]} s={[1.36, 0.82, 0.07]} c="#141414" r={0.35} />
              <mesh position={[0, 0.5, 0.04]}>
                <planeGeometry args={[1.26, 0.72]} />
                <meshBasicMaterial ref={scr} map={tex} toneMapped={false} />
              </mesh>
            </group>
            <pointLight position={[0, 0.5, 0.6]} color="#cfe6ff" intensity={0.6} distance={2.5} decay={2} />
          </group>
        )
      }}
    </SafeModel>
  )
}

/* ───────── 소파 (sofa.glb) + 아빠 (dad.obj) ───────── */
function SofaFallback() {
  const fabric = '#c9bca9'
  return (
    <group>
      <Box p={[0, 0.22, 0]} s={[1.8, 0.3, 0.85]} c="#b5a893" r={1} rad={0.08} />
      <Box p={[0, 0.42, 0.05]} s={[1.5, 0.16, 0.72]} c={fabric} r={1} rad={0.08} />
      <Box p={[0, 0.66, -0.34]} s={[1.6, 0.6, 0.24]} c={fabric} r={1} rad={0.1} />
      {[-0.82, 0.82].map((x) => (
        <Box key={x} p={[x, 0.48, 0]} s={[0.22, 0.38, 0.85]} c={fabric} r={1} rad={0.1} />
      ))}
    </group>
  )
}

function SofaDad() {
  const bubble = useRef()
  const near = useRef(false)
  const last = useRef('')
  const pos = [-2.8, F, -2.6]
  const say = () => {
    last.current = pick(DAD_LINES, last.current)
    bubble.current?.say(last.current)
  }
  const h = useActor('dad', 'talk', '👨 소파에서 TV 보는 아빠', pos, say, 2.6)
  useFrame(() => {
    const p = world.player
    const d = Math.hypot(p.x - pos[0], p.z - pos[2])
    if (d < 1.8 && !near.current) {
      near.current = true
      say()
    } else if (d > 2.8) near.current = false
  })
  // 소파 정면(+z)이 TV(북동쪽)를 향하도록
  return (
    <group position={pos} rotation={[0, Math.PI - 0.55, 0]}>
      <SafeModel name="sofa" fallback={<SofaFallback />} />
      <group {...h}>
        <SafeModel
          name="dad"
          fallback={<FallbackDad />}
          // 앉은 자세 모델(깊이/키 비율 큼)이면 소파 앞쪽에 발을 바닥에 두고 앉힘,
          // 서 있는 모델이면 소파 옆에 서서 TV 를 바라보게 둠
          // 앉은 자세: 방석 윗면(+0.35m)에 걸터앉히고 발이 앞으로 나오게 앞으로 당김 (MODELS.dad.seat 에서 조절)
          place={(fit) => ({ position: fit.ratio > 0.55 ? [0.1, MODELS.dad.seat.y, MODELS.dad.seat.z] : [1.15, 0, 0.45] })}
        >
          {(fit) => <SpeechBubble ref={bubble} y={(fit.loaded ? fit.h : 1.25) + 0.45} />}
        </SafeModel>
      </group>
    </group>
  )
}

function FallbackDad() {
  const head = useRef()
  const chest = useRef()
  return (
    <group position={[0.2, -0.02, 0]}>
      <Dad headRef={head} chestRef={chest} />
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
    if (handset.current) handset.current.position.y = 0.11 + (shake.current > 0 ? Math.abs(Math.sin(clock.elapsedTime * 60)) * 0.01 : 0)
  })
  const pos = [-1.25, F + 0.4, -3.6]
  const h = useActor('phone', 'object', '☎️ 옛날 유선 전화기 (따르릉)', pos, () => {
    playSound('phone', () => audio.ring(), { dur: 3600, once: true, fade: 900 })
    shake.current = 1.6
    setTimeout(() => bubble.current?.say('여보세요~ 응, 엄마야! 밥은 먹었니?'), 1700)
  })
  return (
    <SafeModel
      name="table"
      position={[-1.25, F, -3.6]}
      defaults={{ anchors: { top: 0.35 } }}
      fallback={
        <group>
          <Box p={[0, 0.32, 0]} s={[0.95, 0.06, 0.62]} c="#7a4e2e" r={0.5} rad={0.03} />
          {[
            [-0.4, -0.25],
            [0.4, -0.25],
            [-0.4, 0.25],
            [0.4, 0.25],
          ].map(([x, z], i) => (
            <Box key={i} p={[x, 0.15, z]} s={[0.06, 0.3, 0.06]} c="#5a3a24" />
          ))}
        </group>
      }
    >
      {(fit) => (
        <group position={[0, fit.anchors.top ?? 0.35, 0]}>
          {/* 찻잔 + 책 */}
          <Cyl p={[0.3, 0.04, 0.15]} r={0.05} rb={0.04} h={0.08} c="#f2eee6" />
          <Box p={[-0.32, 0.02, -0.1]} s={[0.3, 0.04, 0.22]} c="#e4d6bc" rad={0.01} />
          <group position={[-0.05, 0, -0.05]} rotation={[0, 0.5, 0]} {...h}>
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
      )}
    </SafeModel>
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

/* ───────── 겨울 난로 + 양은 주전자 (stove.obj) ───────── */
function StoveFallback({ fire }) {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} geometry={roundBoxGeo(0.72, 0.56, 0.6, 0.06)}>
        <meshStandardMaterial color="#1f1e1d" roughness={0.55} metalness={0.4} />
      </mesh>
      <mesh ref={fire} position={[0, 0.4, 0.302]}>
        <planeGeometry args={[0.38, 0.26]} />
        <meshStandardMaterial color="#ff8a3a" emissive="#ff6a1a" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <Box p={[0, 0.72, 0]} s={[0.78, 0.05, 0.66]} c="#2a2826" m={0.4} />
      {[
        [-0.28, -0.22],
        [0.28, -0.22],
        [-0.28, 0.22],
        [0.28, 0.22],
      ].map(([x, z], i) => (
        <Cyl key={i} p={[x, 0.07, z]} r={0.035} h={0.14} c="#1f1e1d" />
      ))}
      {/* 양은 주전자 */}
      <group position={[0, 0.82, 0]}>
        <mesh geometry={roundCylGeo(0.13, 0.17, 0.2, 28, 0.05)}>
          <meshStandardMaterial color="#d6b25a" metalness={0.75} roughness={0.28} />
        </mesh>
        <Cyl p={[0, 0.11, 0]} r={0.12} h={0.02} c="#cfa84e" />
        <mesh position={[-0.19, 0.05, 0]} rotation={[0, 0, 0.9]}>
          <capsuleGeometry args={[0.025, 0.15, 4, 10]} />
          <meshStandardMaterial color="#d6b25a" metalness={0.75} roughness={0.28} />
        </mesh>
      </group>
    </group>
  )
}

function StoveKettle() {
  const on = useStore((s) => s.kettleOn)
  const fire = useRef()
  const glow = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const k = 1.6 + Math.sin(t * 7) * 0.3 + Math.sin(t * 13) * 0.2
    if (fire.current) fire.current.material.emissiveIntensity = k
    if (glow.current) glow.current.intensity = 1.2 + Math.sin(t * 7) * 0.25
  })
  const base = [0.55, F, -5.35]
  const h = useActor('kettle', 'object', '🫖 난로 위 양은 주전자 (물 끓이기)', [base[0], F + 0.8, base[2]], () => {
    playAmbient('kettle', 'kettle', 6500, 'kettleOn')
    showToast('🫖 주전자 물이 끓어요… 뿌우~')
  })
  return (
    <group position={base} {...h}>
      <SafeModel name="stove" fallback={<StoveFallback fire={fire} />} defaults={{ h: 1.0, top: new THREE.Vector3(0, 1.0, 0) }}>
        {(fit) => (
          <>
            {/* 모델에 연통이 없으면(키가 낮으면) 천장까지 연통을 세움 */}
            {(!fit.loaded || fit.h < 1.3) && <Cyl p={[0.12, (fit.h + CEIL) / 2, -0.18]} r={0.075} h={Math.max(0.2, CEIL - fit.h)} c="#2a2826" />}
            <Steam on={on} p={[fit.top.x, fit.top.y + 0.02, fit.top.z]} spread={0.06} rise={0.85} size={0.2} />
            <Steam on={on} p={[fit.top.x - 0.12, fit.top.y - 0.06, fit.top.z]} n={4} spread={0.05} rise={0.7} size={0.16} />
            <SoundBadge id="kettle" p={[fit.top.x, fit.top.y + 0.45, fit.top.z]} />
          </>
        )}
      </SafeModel>
      <pointLight ref={glow} position={[0, 0.45, 0.6]} color="#ff9a4a" intensity={1.4} distance={2.6} decay={2} />
    </group>
  )
}

/* ───────── 러그 위 엎드린 갈색 푸들 ───────── */
const POODLE_LINES = ['낑~ 쓰담쓰담 해줘', '꼬리 살랑살랑~', '햇볕 너무 따뜻해…', '같이 낮잠 잘래?']
function Poodle() {
  const dog = useRef()
  const hearts = useRef()
  const bubble = useRef()
  const body = useRef()
  const wag = useRef(0)
  const last = useRef('')
  const pos = [-0.3, F, -2.7]
  // OBJ 모델엔 뼈대가 없으니 몸 전체로 숨쉬기 · 꼬물꼬물 · 깡총
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    wag.current = Math.max(0, wag.current - dt)
    const w = wag.current
    if (!body.current) return
    body.current.scale.set(1 + Math.sin(t * 2.2) * 0.012, 1 + Math.sin(t * 2.2) * 0.025, 1)
    body.current.rotation.y = Math.sin(t * 16) * 0.08 * Math.min(1, w)
    body.current.position.y = Math.abs(Math.sin(t * 9)) * 0.05 * Math.min(1, w)
  })
  const act = () => {
    last.current = pick(POODLE_LINES, last.current)
    bubble.current?.say(last.current, 3000)
    playSound(
      'poodle',
      () => {
        dog.current?.wag(1.6)
        wag.current = 1.4
        hearts.current?.burst()
        audio.whine()
      },
      { dur: 5500, gap: [1700, 2300] }
    )
  }
  const h = useActor('poodle', 'talk', '🐩 러그 위 갈색 푸들', pos, act, 2.2)
  return (
    <group position={pos} rotation={[0, 0.5, 0]} {...h}>
      <group ref={body}>
        <SafeModel name="dog" fallback={<Dog ref={dog} pose="lie" kind="poodle" color="#8a5634" light="#a56c45" size={0.85} />}>
          {(fit) => (
            <>
              <Hearts ref={hearts} y={(fit.loaded ? fit.h : 0.4) + 0.15} />
              <SpeechBubble ref={bubble} y={(fit.loaded ? fit.h : 0.4) + 0.6} scale={0.8} />
              <SoundBadge id="poodle" p={[0, (fit.loaded ? fit.h : 0.4) + 0.35, 0]} />
            </>
          )}
        </SafeModel>
      </group>
    </group>
  )
}

/* (예전 낱개) 협탁 스탠드 · 보조 의자 — 소파 세트가 없을 때만 */
function LegacyLampChair() {
  return (
    <group>
      {/* 소파 옆 협탁 + 스탠드 (tablelamp.glb) */}
      <Real position={[-3.72, F, -4.05]}>
      <Box p={[0, 0.27, 0]} s={[0.45, 0.54, 0.45]} c="#5a3a24" r={0.6} />
      <SafeModel
        name="tablelamp"
        position={[0, 0.54, 0]}
        fallback={
          <group>
            <Cyl p={[0, 0.15, 0]} r={0.03} h={0.3} c="#c9a46a" />
            <mesh position={[0, 0.38, 0]} geometry={roundCylGeo(0.12, 0.18, 0.22, 24, 0.02)}>
              <meshStandardMaterial color="#f5ead2" emissive="#ffcf8a" emissiveIntensity={0.9} roughness={0.9} />
            </mesh>
          </group>
        }
      >
        {(fit) => <pointLight position={[0, (fit.loaded ? fit.h : 0.45) * 0.8, 0.15]} color="#ffc778" intensity={1.6} distance={3.5} decay={2} />}
      </SafeModel>
      </Real>
      {/* 거실 한쪽 보조 의자 (chair.glb) — 통유리창 옆에서 거실을 바라봄 */}
      <SafeModel
        name="chair"
        position={[-3.3, F, 0.6]}
        rotation={[0, Math.PI / 2, 0]}
        fallback={
          <group>
            <Box p={[0, 0.42, 0]} s={[0.55, 0.08, 0.55]} c="#8a5c39" rad={0.03} />
            <Box p={[0, 0.72, -0.25]} s={[0.55, 0.55, 0.06]} c="#8a5c39" rad={0.03} />
            {[
              [-0.23, -0.23],
              [0.23, -0.23],
              [-0.23, 0.23],
              [0.23, 0.23],
            ].map(([x, z], i) => (
              <Box key={i} p={[x, 0.2, z]} s={[0.05, 0.4, 0.05]} c="#5a3a24" />
            ))}
          </group>
        }
      />
    </group>
  )
}

/* ───────── 화분 · 방석 · 조명 ───────── */
function Props() {
  return (
    <group>
      {/* 창가 화분 (plant.glb) */}
      <SafeModel
        name="plant"
        position={[-3.1, F, -5.5]}
        fallback={
          <group>
            <mesh position={[0, 0.22, 0]} geometry={roundCylGeo(0.22, 0.17, 0.44, 24, 0.04)}>
              <meshStandardMaterial color="#6e4a32" roughness={0.8} />
            </mesh>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Sph key={i} p={[Math.cos(i) * 0.22, 0.9 + (i % 3) * 0.25, Math.sin(i) * 0.18]} r={0.24} sc={[1, 0.8, 1]} c={i % 2 ? '#4f6e3a' : '#5d7d44'} />
            ))}
          </group>
        }
      />
      {/* 모서리 유칼립투스 (EucalyptusPlant.glb) */}
      <SafeModel
        name="eucalyptus"
        position={[1.0, F, -1.1]}
        fallback={
          <group>
            <mesh position={[0, 0.18, 0]} geometry={roundCylGeo(0.17, 0.13, 0.36, 24, 0.03)}>
              <meshStandardMaterial color="#d9cfc0" roughness={0.7} />
            </mesh>
            {[0, 1, 2, 3].map((i) => (
              <Sph key={i} p={[Math.cos(i * 1.6) * 0.12, 0.6 + i * 0.12, Math.sin(i * 1.6) * 0.12]} r={0.17} sc={[1, 1.3, 1]} c="#7d9a78" />
            ))}
          </group>
        }
      />
      {/* 방석 */}
      <Box p={[-1.6, F + 0.04, 0.4]} s={[0.55, 0.08, 0.55]} c="#a5674a" r={1} rad={0.04} />
      <Box p={[-1.5, F + 0.11, 0.45]} s={[0.5, 0.06, 0.5]} c="#d4b483" r={1} rad={0.03} rot={[0, 0.3, 0]} />
      {/* 천장 형광등 + 실내 보조광 */}
      <mesh position={[-1.3, 2.93, -2.4]} geometry={roundBoxGeo(1.9, 0.07, 0.22, 0.03)} userData={{ noCast: true }}>
        <meshStandardMaterial color="#ffffff" emissive="#fff6e6" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <pointLight position={[-1.3, 2.7, -2.4]} color="#fff1dc" intensity={2.2} distance={8} decay={1.6} />
      <pointLight position={[-1.2, 2.4, 1.5]} color="#ffe7c4" intensity={1.0} distance={6} decay={1.8} />
      {/* 서까래 상향 간접광: 천장 위쪽이 시커멓게 죽지 않게 */}
      {[
        [-1.8, -3.0],
        [0.6, -0.8],
        [-1.6, 2.2],
        [3.4, -3.0],
      ].map(([x, z], i) => (
        <pointLight key={i} position={[x, 3.25, z]} color="#ffd9a8" intensity={0.9} distance={4.2} decay={1.6} />
      ))}
    </group>
  )
}

export default function Living() {
  return (
    <group>
      {/* 거실 세트 (구역: 마루/거실) — 세트 파일이 없으면 예전 낱개 모델/도형으로 대체 */}
      <ZoneGroup zone="house">
        <LivingSofaSet
          legacy={
            <>
              <Rug />
              <SofaDad />
              <Poodle />
              <LegacyLampChair />
            </>
          }
        />
        <TvStoveSet
          legacy={
            <>
              <TV />
              <StoveKettle />
            </>
          }
        />
        <PhoneTable />
      </ZoneGroup>
      <Clock />
      <Props />
    </group>
  )
}
