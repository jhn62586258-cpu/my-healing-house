/* ─────────────────────────────────────────────────────────────
   12개 세트 모델 배치 (거실·부엌 4 · 앞마당 4 · 내 방 3 + 주인공은 Character.jsx)
   - /models/<이름>.glb 를 먼저 찾고, 없으면 /models/<이름>.obj + <이름>_tex.png
   - 둘 다 없으면 legacy(예전 낱개 모델/도형)로 자동 대체
   - 세트 안의 주전자·뚝배기·아빠·강아지 위치는 points(세트 크기 대비 비율)로 지정 →
     위에서 레이캐스트해서 실제 표면 높이를 찾아 김·🔊·말풍선·터치 영역을 붙임
   - ZoneGroup: 플레이어가 있는 구역 세트만 렌더링 (스마트폰 60fps)
   ───────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world, useActor, useStore, showToast, playSound, playAmbient, openLetter, zoneOf, FLOOR, S, DAD_LINES, MOM_LINES } from '../store'
import * as audio from '../audio/AsmrEngine'
import { SafeModel } from './ModelKit'
import { SpeechBubble, Hearts, Steam, SoundBadge } from './Fx'
import { BubbleWrapToy, KeycapsToy, CatSquishyToy, SketchbookToy } from './Toys'

const F = FLOOR
const pick = (arr, prev) => {
  let s = arr[Math.floor(Math.random() * arr.length)]
  if (s === prev && arr.length > 1) s = arr[(arr.indexOf(s) + 1) % arr.length]
  return s
}

/* ───────── 배치표 ─────────
   pos  : 공간 좌표 [x, 바닥y, z]   rot : y 회전 (모델 정면 +z 기준)
   fit/size/maxH/maxW/align : 자동 크기 · 정렬 (ModelKit.fitModel)
   points: { 이름: [가로비율 -1~1, 깊이비율 -1~1, (레이 시작 높이 m)] } */
export const PLACE = {
  // ── 거실·부엌 ──
  living_sofa_set: { zone: 'house', pos: [-2.75, F, -2.7], rot: Math.PI - 0.55, fit: 'width', size: 2.8, maxH: 1.6, points: { dad: [-0.05, -0.1], poodle: [0.45, 0.8, 0.6], lamp: [-0.9, -0.6] } },
  tv_stove_set: { zone: 'house', pos: [-1.0, F, -5.92], rot: 0, fit: 'width', size: 2.8, maxH: 2.4, align: 'back', points: { kettle: [0.72, 0.1], tv: [-0.3, 0.2] } },
  kitchen_mom_set: { zone: 'house', pos: [3.35, F, -5.92], rot: 0, fit: 'width', size: 2.8, maxH: 2.4, align: 'back', points: { stew: [0.3, -0.2, 1.15], mom: [0.05, 0.75] } },
  dining_set: { zone: 'house', pos: [2.6, F, 0.3], rot: 0, fit: 'width', size: 1.6, maxH: 1.3, points: { basket: [0, 0] } },
  // ── 앞마당 ──
  pyeongsang: { zone: 'yard', pos: [-5.85, 0, -3.35], rot: Math.PI / 2, fit: 'width', size: 1.6, maxH: 1.3, points: { seat: [-0.25, 0, 0.75], basket: [0.45, 0.25] } },
  doghouse_set: { zone: 'yard', pos: [-6.1, 0, -5.6], rot: 0, fit: 'width', size: 1.5, maxH: 1.3, points: { dog: [0.5, 0.45] } },
  persimmon_tree: { zone: 'yard', pos: [-8.8, 0, 3.1], rot: Math.PI / 2, fit: 'height', size: 3.2, points: { dog: [0.3, 0.45, 1.0] } },
  mailbox: { zone: 'yard', pos: [-6.85, 0, 5.95], rot: 0, fit: 'height', size: 1.2, points: { box: [0, 0] } },
  // ── 내 방 아지트 ──
  desk_hideout: {
    zone: 'room',
    pos: [8.92, F, -0.6],
    rot: -Math.PI / 2, // 동쪽 창가 벽에 등을 대고 방 안(서쪽)을 바라봄
    fit: 'width',
    size: 1.9,
    maxH: 1.5,
    align: 'back',
    // 책상 상판(약 0.7m) 아래에서 쏴서 담요 윗면을 찾음
    points: { wrap: [-0.6, 0.4, 0.55], keys: [-0.2, 0.4, 0.55], squishy: [0.2, 0.4, 0.55], sketch: [0.6, 0.4, 0.55], lantern: [0.85, 0.6] },
  },
  bed: { zone: 'room', pos: [6.45, F, -3.92], rot: 0, fit: 'width', size: 1.9, maxH: 1.1, align: 'back' },
  bookshelf: { zone: 'room', pos: [8.3, F, -3.92], rot: 0, fit: 'height', size: 1.6, maxW: 1.0, align: 'back' },
}

/* 세트 안 지점(실제 m, 세트 좌표) → 공간 좌표 */
export function toSpace(P, l) {
  const c = Math.cos(P.rot)
  const s = Math.sin(P.rot)
  return [P.pos[0] + (l.x * c + l.z * s) / S, P.pos[1] + l.y / S, P.pos[2] + (-l.x * s + l.z * c) / S]
}

/* ───────── 구역별 렌더링 ─────────
   유리창으로 서로 보이는 마루↔앞마당은 함께, 내 방은 단독 (벽으로 막혀 안 보임) */
export const ZONE_VIEW = { house: ['house', 'yard'], yard: ['yard', 'house'], room: ['room'] }
export function ZoneGroup({ zone, children }) {
  const g = useRef()
  useFrame(() => {
    const p = world.player
    const v = ZONE_VIEW[zoneOf(p.x, p.z)].includes(zone)
    if (g.current.visible !== v) g.current.visible = v
  })
  return <group ref={g}>{children}</group>
}

/* ───────── glb → obj+tex → legacy 자동 감지 ───────── */
function Fail({ onFail }) {
  useEffect(() => {
    onFail()
  }, [onFail])
  return null
}
export function AutoModel({ name, legacy = null, children }) {
  const P = PLACE[name]
  const [stage, setStage] = useState(0)
  const def = useMemo(() => (stage === 0 ? { ...P, url: `/models/${name}.glb` } : { ...P, url: `/models/${name}.obj`, tex: `/models/${name}_tex.png` }), [stage, name, P])
  const next = useMemo(() => () => setStage((s) => s + 1), [])
  if (stage >= 2) return legacy
  return (
    <SafeModel key={stage} name={name} def={def} position={P.pos} rotation-y={P.rot} childrenOnFail={false} fallback={<Fail onFail={next} />}>
      {(fit) => (fit.loaded ? children?.(fit, P) : null)}
    </SafeModel>
  )
}

/* ───────── 터치 영역 + 액션 바 등록 ───────── */
function Hotspot({ id, kind, label, P, at, act, reach = 2.3, r = 0.3, children }) {
  const sp = useMemo(() => toSpace(P, at), [P, at])
  const h = useActor(id, kind, label, sp, act, reach)
  return (
    <group position={[at.x, at.y, at.z]}>
      <mesh position={[0, -r * 0.4, 0]} {...h}>
        <sphereGeometry args={[r, 10, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {children}
    </group>
  )
}

/* ═════════ 거실·부엌 ═════════ */
function DadSpot({ fit, P }) {
  const bubble = useRef()
  const near = useRef(false)
  const last = useRef('')
  const say = () => {
    last.current = pick(DAD_LINES, last.current)
    bubble.current?.say(last.current)
  }
  const sp = useMemo(() => toSpace(P, fit.points.dad), [fit, P])
  useFrame(() => {
    const p = world.player
    const d = Math.hypot(p.x - sp[0], p.z - sp[2])
    if (d < 1.8 && !near.current) {
      near.current = true
      say()
    } else if (d > 2.8) near.current = false
  })
  return (
    <Hotspot id="dad" kind="talk" label="👨 소파에서 TV 보는 아빠" P={P} at={fit.points.dad} act={say} reach={2.6} r={0.4}>
      <SpeechBubble ref={bubble} y={0.4} />
    </Hotspot>
  )
}
const POODLE_LINES = ['낑~ 쓰담쓰담 해줘', '꼬리 살랑살랑~', '햇볕 너무 따뜻해…', '같이 낮잠 잘래?']
function PoodleSpot({ fit, P }) {
  const hearts = useRef()
  const bubble = useRef()
  const last = useRef('')
  const act = () => {
    last.current = pick(POODLE_LINES, last.current)
    bubble.current?.say(last.current, 3000)
    playSound('poodle', () => {
      hearts.current?.burst()
      audio.whine()
    }, { dur: 5500, gap: [1700, 2300] })
  }
  return (
    <Hotspot id="poodle" kind="talk" label="🐩 러그 위 갈색 푸들" P={P} at={fit.points.poodle} act={act} reach={2.2} r={0.25}>
      <Hearts ref={hearts} y={0.15} />
      <SpeechBubble ref={bubble} y={0.55} scale={0.8} />
      <SoundBadge id="poodle" p={[0, 0.32, 0]} />
    </Hotspot>
  )
}
export function LivingSofaSet({ legacy }) {
  return (
    <AutoModel name="living_sofa_set" legacy={legacy}>
      {(fit, P) => (
        <>
          <DadSpot fit={fit} P={P} />
          <PoodleSpot fit={fit} P={P} />
          <pointLight position={[fit.points.lamp.x, fit.points.lamp.y - 0.1, fit.points.lamp.z]} color="#ffc778" intensity={1.6} distance={3.5} decay={2} />
        </>
      )}
    </AutoModel>
  )
}

function KettleSpot({ fit, P }) {
  const on = useStore((s) => s.kettleOn)
  const glow = useRef()
  useFrame(({ clock }) => {
    if (glow.current) glow.current.intensity = 1.2 + Math.sin(clock.elapsedTime * 7) * 0.25
  })
  const k = fit.points.kettle
  return (
    <>
      <Hotspot
        id="kettle"
        kind="object"
        label="🫖 난로 위 양은 주전자 (물 끓이기)"
        P={P}
        at={k}
        act={() => {
          playAmbient('kettle', 'kettle', 6500, 'kettleOn')
          showToast('🫖 주전자 물이 끓어요… 뿌우~')
        }}
      >
        <Steam on={on} p={[0, 0.02, 0]} spread={0.06} rise={0.85} size={0.2} />
        <Steam on={on} p={[-0.1, -0.04, 0]} n={4} spread={0.05} rise={0.7} size={0.16} />
        <SoundBadge id="kettle" p={[0, 0.45, 0]} />
      </Hotspot>
      <pointLight ref={glow} position={[k.x, k.y * 0.45, k.z + 0.45]} color="#ff9a4a" intensity={1.3} distance={2.6} decay={2} />
    </>
  )
}
function TvSpot({ fit, P }) {
  return (
    <Hotspot
      id="tv"
      kind="object"
      label="📺 켜져 있는 TV (채널 돌리기)"
      P={P}
      at={fit.points.tv}
      r={0.45}
      act={() => {
        audio.tvStatic()
        showToast('📺 아빠: "어, 그거 보던 건데~"')
      }}
    />
  )
}
export function TvStoveSet({ legacy }) {
  return (
    <AutoModel name="tv_stove_set" legacy={legacy}>
      {(fit, P) => (
        <>
          <KettleSpot fit={fit} P={P} />
          <TvSpot fit={fit} P={P} />
        </>
      )}
    </AutoModel>
  )
}

function StewSpot({ fit, P }) {
  const on = useStore((s) => s.stewOn)
  return (
    <Hotspot
      id="stew"
      kind="object"
      label="🍲 된장찌개 뚝배기 (보글보글)"
      P={P}
      at={fit.points.stew}
      r={0.22}
      act={() => {
        playAmbient('stew', 'stew', 6500, 'stewOn')
        showToast('🍲 된장찌개가 보글보글 끓어요')
      }}
    >
      <Steam on={on} p={[0, 0.06, 0]} spread={0.07} rise={0.85} />
      <SoundBadge id="stew" p={[0, 0.5, 0]} />
    </Hotspot>
  )
}
function MomSpot({ fit, P }) {
  const bubble = useRef()
  const last = useRef('')
  const say = () => {
    last.current = pick(MOM_LINES, last.current)
    bubble.current?.say(last.current)
  }
  return (
    <Hotspot id="mom" kind="talk" label="👩 부엌의 뽀글머리 엄마" P={P} at={fit.points.mom} act={say} reach={2.6} r={0.4}>
      <SpeechBubble ref={bubble} y={0.4} />
    </Hotspot>
  )
}
export function KitchenMomSet({ legacy }) {
  return (
    <AutoModel name="kitchen_mom_set" legacy={legacy}>
      {(fit, P) => (
        <>
          <StewSpot fit={fit} P={P} />
          <MomSpot fit={fit} P={P} />
        </>
      )}
    </AutoModel>
  )
}
export function DiningSet({ legacy }) {
  return <AutoModel name="dining_set" legacy={legacy} />
}

/* ═════════ 앞마당 ═════════ */
function SeatRegister({ fit, P }) {
  useEffect(() => {
    const sp = toSpace(P, fit.points.seat)
    world.seats.pyeong = { x: sp[0], z: sp[2], y: fit.points.seat.y / S }
  }, [fit, P])
  return null
}
export function PyeongsangSet({ legacy }) {
  const hearts = useRef()
  return (
    <AutoModel name="pyeongsang" legacy={legacy}>
      {(fit, P) => (
        <>
          <SeatRegister fit={fit} P={P} />
          <Hotspot
            id="persimmon"
            kind="object"
            label="🍊 평상 위 감 바구니"
            P={P}
            at={fit.points.basket}
            r={0.25}
            act={() => {
              hearts.current?.burst()
              playSound('persimmon', () => audio.squish(), { dur: 2500, once: true, fade: 800 })
              showToast('🍊 말랑말랑 홍시 하나 냠냠~ 달다!')
            }}
          >
            <Hearts ref={hearts} y={0.2} ch="🧡" />
            <SoundBadge id="persimmon" p={[0, 0.4, 0]} />
          </Hotspot>
        </>
      )}
    </AutoModel>
  )
}

function DogSpot({ id, label, lines, size, fit, P }) {
  const bubble = useRef()
  const last = useRef('')
  const act = () => {
    last.current = pick(lines, last.current)
    bubble.current?.say(last.current, 2600)
    playSound(id, () => audio.bark(size, size > 1.05 ? 2 : 1), { dur: 5500, gap: [1800, 2500] })
  }
  return (
    <Hotspot id={id} kind="talk" label={label} P={P} at={fit.points.dog} act={act} r={0.35}>
      <SpeechBubble ref={bubble} y={0.6} scale={0.8} />
      <SoundBadge id={id} p={[0, 0.38, 0]} />
    </Hotspot>
  )
}
export function DoghouseSet({ legacy }) {
  return (
    <AutoModel name="doghouse_set" legacy={legacy}>
      {(fit, P) => <DogSpot id="nureongi" label="🐕 개집 옆 누렁이" lines={['멍멍! 산책 가자!', '멍! 간식 있어?', '왈왈~ 반가워!']} size={1.15} fit={fit} P={P} />}
    </AutoModel>
  )
}
export function PersimmonTreeSet({ legacy }) {
  return (
    <AutoModel name="persimmon_tree" legacy={legacy}>
      {(fit, P) => <DogSpot id="baekgu" label="🐶 감나무 아래 하얀 백구" lines={['멍! 반가워!', '멍멍~ 같이 놀자!', '킁킁… 맛있는 냄새!']} size={1.0} fit={fit} P={P} />}
    </AutoModel>
  )
}
export function MailboxSet({ legacy }) {
  return (
    <AutoModel name="mailbox" legacy={legacy}>
      {(fit, P) => (
        <Hotspot
          id="mailbox"
          kind="object"
          label="📮 빨간 우체통 (엄마의 편지)"
          P={P}
          at={fit.points.box}
          r={0.35}
          act={() => {
            audio.paper()
            openLetter()
          }}
        />
      )}
    </AutoModel>
  )
}

/* ═════════ 내 방 아지트 ═════════ */
function ToyAt({ fit, P, name, Toy }) {
  const at = fit.points[name]
  const sp = useMemo(() => toSpace(P, at), [P, at])
  return (
    <group position={[at.x, at.y, at.z]}>
      <Toy actorPos={sp} />
    </group>
  )
}
export function DeskHideoutSet({ legacy }) {
  return (
    <AutoModel name="desk_hideout" legacy={legacy}>
      {(fit, P) => (
        <>
          {/* 담요 윗면 높이에 진짜 인터랙티브 장난감 4종 */}
          <ToyAt fit={fit} P={P} name="wrap" Toy={BubbleWrapToy} />
          <ToyAt fit={fit} P={P} name="keys" Toy={KeycapsToy} />
          <ToyAt fit={fit} P={P} name="squishy" Toy={CatSquishyToy} />
          <ToyAt fit={fit} P={P} name="sketch" Toy={SketchbookToy} />
          {/* 꼬마전구·랜턴 불빛 */}
          <pointLight position={[fit.points.lantern.x, fit.points.lantern.y + 0.15, fit.points.lantern.z]} color="#ffcf70" intensity={2.2} distance={3} decay={2} />
          <pointLight position={[0, 0.45, fit.d * 0.7]} color="#ffd9a0" intensity={1.4} distance={2.4} decay={2} />
        </>
      )}
    </AutoModel>
  )
}
export function BedSet({ legacy }) {
  return <AutoModel name="bed" legacy={legacy} />
}
export function BookshelfSet({ legacy }) {
  return (
    <AutoModel name="bookshelf" legacy={legacy}>
      {/* 한지 스탠드 은은한 빛 */}
      {(fit) => <pointLight position={[0, fit.h * 0.85, fit.d + 0.2]} color="#ffdcae" intensity={1.2} distance={3} decay={2} />}
    </AutoModel>
  )
}
