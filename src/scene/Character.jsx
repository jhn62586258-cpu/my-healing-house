import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OUTFITS, world, getState, S } from '../store'
import { floralTex } from './textures'
import { SafeModel, useClips, FacePatch } from './ModelKit'

/* 2등신 비닐 피규어 느낌: 매끈한 피부(roughness 낮게) + 무광 옷 */
const SKIN = '#f0cbb0'
const std = (c, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r })
const SKIN_M = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.48 })
const EYE = new THREE.MeshStandardMaterial({ color: '#1f1814', roughness: 0.15 })
const WHITE = new THREE.MeshBasicMaterial({ color: '#ffffff' })
const BLUSH = new THREE.MeshStandardMaterial({ color: '#f2a4a0', roughness: 1, transparent: true, opacity: 0.45 })
const MOUTH = new THREE.MeshStandardMaterial({ color: '#b86a5e', roughness: 0.7 })

/* 다정한 피규어 얼굴 — 작고 까만 점 눈 + 은은한 볼터치 */
export function Face({ r = 0.3, eyeY = -0.06, closed = false, eyeGap = 0.3 }) {
  const ex = r * eyeGap
  const ez = (y, x = ex) => Math.sqrt(Math.max(0, r * r - y * y - x * x)) - 0.004
  const blink = useRef([])
  const st = useRef(2 + Math.random() * 2)
  useFrame((_, dt) => {
    if (closed) return
    st.current -= dt
    if (st.current < -0.12) st.current = 2.5 + Math.random() * 3
    const sy = st.current < 0 ? 0.15 : 1
    blink.current.forEach((e) => e && (e.scale.y = sy))
  })
  return (
    <group>
      {[-1, 1].map((s, i) => (
        <group key={s}>
          {closed ? (
            <mesh position={[s * ex, eyeY, ez(eyeY)]} rotation={[0, s * 0.3, 0]} material={EYE}>
              <torusGeometry args={[r * 0.065, r * 0.014, 6, 12, Math.PI]} />
            </mesh>
          ) : (
            <group ref={(el) => (blink.current[i] = el)} position={[s * ex, eyeY, ez(eyeY)]}>
              <mesh scale={[1, 1.15, 0.5]} material={EYE}>
                <sphereGeometry args={[r * 0.07, 14, 10]} />
              </mesh>
              <mesh position={[r * 0.02, r * 0.03, r * 0.035]} material={WHITE}>
                <sphereGeometry args={[r * 0.018, 6, 6]} />
              </mesh>
            </group>
          )}
          <mesh position={[s * r * 0.55, eyeY - r * 0.24, ez(eyeY - r * 0.24, r * 0.55) - r * 0.04]} rotation={[0, s * 0.6, 0]} scale={[1, 0.6, 0.25]} material={BLUSH}>
            <sphereGeometry args={[r * 0.15, 12, 8]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, eyeY - r * 0.3, ez(eyeY - r * 0.3, 0) + 0.002]} rotation={[0.2, 0, Math.PI]} material={MOUTH}>
        <torusGeometry args={[r * 0.06, r * 0.016, 6, 12, Math.PI]} />
      </mesh>
    </group>
  )
}

const Blob = ({ r = 0.28 }) => (
  <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} raycast={() => null} userData={{ noCast: true }}>
    <circleGeometry args={[r, 24]} />
    <meshBasicMaterial color="#2a1a10" transparent opacity={0.18} depthWrite={false} />
  </mesh>
)

/* ───────── 주인공: 바가지머리 2등신 (흰 반팔 + 어두운 반바지) ───────── */
function useKidMats(outfit) {
  return useMemo(
    () => ({
      shorts: std(OUTFITS[outfit].shorts, 0.85),
      tee: std('#f7f5f0', 0.85),
      skin: SKIN_M,
      hair: new THREE.MeshStandardMaterial({ color: '#3d2a1f', roughness: 0.42, side: THREE.DoubleSide }),
    }),
    [outfit]
  )
}

function KidLeg({ m }) {
  return (
    <>
      <mesh position={[0, -0.03, 0]} material={m.shorts}>
        <capsuleGeometry args={[0.085, 0.04, 6, 14]} />
      </mesh>
      <mesh position={[0, -0.13, 0]} material={m.skin}>
        <capsuleGeometry args={[0.06, 0.06, 6, 12]} />
      </mesh>
      {/* 동글 발 */}
      <mesh position={[0, -0.2, 0.035]} scale={[1, 0.6, 1.35]} material={m.skin}>
        <sphereGeometry args={[0.068, 16, 12]} />
      </mesh>
    </>
  )
}

/* 바가지 머리: 뒤·옆은 목덜미까지 덮고, 앞은 이마 위 일자 앞머리 */
function BowlHair({ m, r }) {
  const R = r * 1.06
  const front = Math.PI / 2
  const fw = 1.9
  const edge = 1.25
  return (
    <group position={[0, 0.015, -0.006]}>
      <mesh material={m}>
        <sphereGeometry args={[R, 36, 24, front + fw / 2, Math.PI * 2 - fw, 0, 2.15]} />
      </mesh>
      <mesh material={m}>
        <sphereGeometry args={[R, 36, 24, front - fw / 2, fw, 0, edge]} />
      </mesh>
      <mesh material={m} position={[0, R * Math.cos(edge), 0]} rotation={[Math.PI / 2, 0, Math.PI / 2 - fw / 2]}>
        <torusGeometry args={[R * Math.sin(edge), 0.022, 8, 40, fw]} />
      </mesh>
      <mesh material={m} position={[0, R * Math.cos(2.15), 0]} rotation={[Math.PI / 2, 0, Math.PI / 2 + fw / 2]}>
        <torusGeometry args={[R * Math.sin(2.15), 0.024, 8, 48, Math.PI * 2 - fw]} />
      </mesh>
    </group>
  )
}

export function Child({ outfit }) {
  const m = useKidMats(outfit)
  const root = useRef()
  const upper = useRef()
  const legL = useRef()
  const legR = useRef()
  const armL = useRef()
  const armR = useRef()
  const head = useRef()
  const HR = 0.3

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const p = world.player
    const s = p.speed
    const sit = getState().sitting
    const sw = Math.sin(t * 11) * 0.7 * s
    const k = Math.min(1, dt * 10)
    legL.current.rotation.x += ((sit ? -1.45 : sw) - legL.current.rotation.x) * k
    legR.current.rotation.x += ((sit ? -1.45 : -sw) - legR.current.rotation.x) * k
    armL.current.rotation.x = sit ? -0.4 : -sw * 0.9
    armR.current.rotation.x = sit ? -0.4 : sw * 0.9
    root.current.position.y += ((sit ? -0.2 : 0) + p.sitY * S - root.current.position.y) * k
    upper.current.position.y = Math.abs(Math.sin(t * 11)) * 0.025 * s + Math.sin(t * 2) * 0.005
    head.current.rotation.z = Math.sin(t * 1.5) * 0.05 * (1 - s)
    head.current.rotation.x = Math.sin(t * 11) * 0.025 * s + (sit ? -0.05 : 0)
  })

  return (
    <group>
      <Blob />
      <group ref={root}>
        <group ref={legL} position={[-0.075, 0.25, 0]}>
          <KidLeg m={m} />
        </group>
        <group ref={legR} position={[0.075, 0.25, 0]}>
          <KidLeg m={m} />
        </group>
        <group ref={upper}>
          <mesh position={[0, 0.28, 0]} material={m.shorts}>
            <capsuleGeometry args={[0.15, 0.03, 6, 18]} />
          </mesh>
          {/* 흰 반팔 티 */}
          <mesh position={[0, 0.41, 0]} material={m.tee} scale={[1, 1, 0.88]}>
            <capsuleGeometry args={[0.155, 0.1, 8, 20]} />
          </mesh>
          {[
            [armL, -1],
            [armR, 1],
          ].map(([ref, s]) => (
            <group key={s} ref={ref} position={[s * 0.155, 0.5, 0]} rotation={[0, 0, s * 0.18]}>
              <mesh position={[s * 0.015, -0.03, 0]} material={m.tee}>
                <sphereGeometry args={[0.065, 14, 10]} />
              </mesh>
              <mesh position={[s * 0.02, -0.12, 0]} material={m.skin}>
                <capsuleGeometry args={[0.042, 0.06, 6, 10]} />
              </mesh>
            </group>
          ))}
          {/* 큰 머리 (2등신) */}
          <group ref={head} position={[0, 0.82, 0]}>
            <mesh material={m.skin}>
              <sphereGeometry args={[HR, 36, 28]} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * HR * 0.98, -0.05, 0]} scale={[0.45, 1, 0.75]} material={m.skin}>
                <sphereGeometry args={[0.055, 12, 10]} />
              </mesh>
            ))}
            <BowlHair m={m.hair} r={HR} />
            <Face r={HR} eyeY={-0.06} />
          </group>
        </group>
      </group>
    </group>
  )
}

/* 1인칭: 시선 아래 보이는 반바지 + 다리 */
export function FPLegs({ outfit }) {
  const m = useKidMats(outfit)
  const L = useRef()
  const R = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const s = world.player.speed
    const sw = Math.sin(t * 9) * 0.3 * s
    L.current.rotation.x = -(0.5 + sw)
    R.current.rotation.x = -(0.5 - sw)
  })
  return (
    <group position={[0, 0, 0.1]}>
      <group ref={L} position={[-0.09, 0.25, 0]}>
        <KidLeg m={m} />
      </group>
      <group ref={R} position={[0.09, 0.25, 0]}>
        <KidLeg m={m} />
      </group>
    </group>
  )
}

/* ───────── 뽀글머리 엄마 (꽃무늬 앞치마, 2등신) ───────── */
export function Mom({ armRef, headRef }) {
  const perm = useMemo(() => {
    const pts = []
    const R = 0.3
    let k = 7
    const rnd = () => ((k = (k * 9301 + 49297) % 233280) / 233280)
    for (let i = 0; i < 120; i++) {
      const th = Math.acos(1 - rnd() * 1.55)
      const ph = rnd() * Math.PI * 2
      const x = Math.sin(th) * Math.cos(ph)
      const y = Math.cos(th)
      const z = Math.sin(th) * Math.sin(ph)
      if (z > 0.3 && y < 0.5) continue
      const big = 1.06 + rnd() * 0.08
      pts.push([x * R * big, y * R * big + 0.05, z * R * big - 0.02, 0.06 + rnd() * 0.03])
    }
    return pts
  }, [])
  const hair = useMemo(() => std('#2e211b', 0.5), [])
  const top = useMemo(() => std('#c9b8a2', 0.85), [])
  const skirt = useMemo(() => std('#6d6a66', 0.85), [])
  const apron = useMemo(() => new THREE.MeshStandardMaterial({ map: floralTex(), roughness: 0.85 }), [])
  return (
    <group>
      <Blob r={0.32} />
      {/* 다리 + 슬리퍼 */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.09, 0.14, 0]} material={SKIN_M}>
            <capsuleGeometry args={[0.065, 0.12, 6, 12]} />
          </mesh>
          <mesh position={[s * 0.09, 0.03, 0.04]} scale={[1, 0.45, 1.5]}>
            <sphereGeometry args={[0.075, 12, 10]} />
            <meshStandardMaterial color="#8a7a6c" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* 치마 + 통통한 상체 */}
      <mesh position={[0, 0.34, 0]} material={skirt}>
        <cylinderGeometry args={[0.2, 0.25, 0.22, 24]} />
      </mesh>
      <mesh position={[0, 0.55, 0]} material={top} scale={[1, 1, 0.85]}>
        <capsuleGeometry args={[0.215, 0.16, 8, 20]} />
      </mesh>
      {/* 꽃무늬 앞치마 (주름 프릴) */}
      <mesh position={[0, 0.45, 0.17]} rotation={[0.08, 0, 0]} material={apron} scale={[1, 1, 0.22]}>
        <capsuleGeometry args={[0.18, 0.22, 6, 16]} />
      </mesh>
      <mesh position={[0, 0.25, 0.2]} rotation-x={Math.PI / 2} material={apron}>
        <torusGeometry args={[0.17, 0.025, 6, 20, Math.PI]} />
      </mesh>
      {/* 왼팔 */}
      <group position={[-0.23, 0.66, 0]} rotation={[-0.5, 0, 0.2]}>
        <mesh position={[0, -0.1, 0]} material={top}>
          <capsuleGeometry args={[0.055, 0.12, 6, 12]} />
        </mesh>
        <mesh position={[0, -0.2, 0]} material={SKIN_M}>
          <sphereGeometry args={[0.05, 12, 10]} />
        </mesh>
      </group>
      {/* 오른팔 (국자 젓기) */}
      <group ref={armRef} position={[0.23, 0.66, 0]} rotation={[-0.9, 0, -0.15]}>
        <mesh position={[0, -0.1, 0]} material={top}>
          <capsuleGeometry args={[0.055, 0.12, 6, 12]} />
        </mesh>
        <mesh position={[0, -0.2, 0]} material={SKIN_M}>
          <sphereGeometry args={[0.05, 12, 10]} />
        </mesh>
        <mesh position={[0, -0.27, 0.05]} rotation={[0.6, 0, 0]}>
          <capsuleGeometry args={[0.012, 0.22, 4, 6]} />
          <meshStandardMaterial color="#c9c4bb" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
      {/* 큰 머리 + 뽀글 파마 */}
      <group ref={headRef} position={[0, 1.02, 0]}>
        <mesh material={SKIN_M}>
          <sphereGeometry args={[0.29, 32, 24]} />
        </mesh>
        {perm.map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} material={hair}>
            <sphereGeometry args={[r, 10, 8]} />
          </mesh>
        ))}
        <Face r={0.29} eyeY={-0.05} closed />
      </group>
    </group>
  )
}

/* ───────── 소파에 기대 TV 보는 아빠 (로컬 +z = 정면) ───────── */
export function Dad({ headRef, chestRef }) {
  const shirt = useMemo(() => std('#55575a', 0.85), [])
  const pants = useMemo(() => std('#2d3038', 0.85), [])
  const hair = useMemo(() => std('#2a201b', 0.55), [])
  return (
    <group>
      {/* 다리 (앉은 자세) */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.11, 0.52, 0.16]} rotation={[Math.PI / 2, 0, 0]} material={pants}>
            <capsuleGeometry args={[0.095, 0.22, 6, 14]} />
          </mesh>
          <mesh position={[s * 0.11, 0.34, 0.33]} material={pants}>
            <capsuleGeometry args={[0.08, 0.18, 6, 12]} />
          </mesh>
          <mesh position={[s * 0.11, 0.2, 0.38]} scale={[1, 0.55, 1.4]} material={SKIN_M}>
            <sphereGeometry args={[0.075, 12, 10]} />
          </mesh>
        </group>
      ))}
      {/* 상체 (등을 기댐) */}
      <group ref={chestRef} position={[0, 0.58, -0.04]} rotation={[-0.28, 0, 0]}>
        <mesh position={[0, 0.17, 0]} material={shirt} scale={[1, 1, 0.9]}>
          <capsuleGeometry args={[0.22, 0.16, 8, 20]} />
        </mesh>
        <group position={[-0.24, 0.27, 0]} rotation={[0, 0, 1.0]}>
          <mesh position={[0, -0.1, 0]} material={shirt}>
            <capsuleGeometry args={[0.065, 0.14, 6, 12]} />
          </mesh>
        </group>
        <group position={[0.24, 0.25, 0]} rotation={[-1.0, 0, -0.2]}>
          <mesh position={[0, -0.1, 0]} material={shirt}>
            <capsuleGeometry args={[0.065, 0.14, 6, 12]} />
          </mesh>
          <mesh position={[0, -0.22, 0]} material={SKIN_M}>
            <sphereGeometry args={[0.058, 12, 10]} />
          </mesh>
        </group>
        <group ref={headRef} position={[0, 0.63, 0.02]} rotation={[0.2, 0, 0]}>
          <mesh material={SKIN_M}>
            <sphereGeometry args={[0.3, 32, 24]} />
          </mesh>
          <mesh position={[0, 0.04, -0.02]} scale={[1.05, 0.9, 1.05]} material={hair}>
            <sphereGeometry args={[0.3, 32, 16, 0, Math.PI * 2, 0, 1.45]} />
          </mesh>
          <mesh position={[0, -0.02, -0.06]} scale={[1.04, 1, 1]} material={hair}>
            <sphereGeometry args={[0.3, 32, 16, Math.PI * 0.15 + Math.PI, Math.PI * 0.7, 0.6, 1.3]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.29, -0.04, 0]} scale={[0.45, 1, 0.75]} material={SKIN_M}>
              <sphereGeometry args={[0.055, 10, 8]} />
            </mesh>
          ))}
          <Face r={0.3} eyeY={-0.04} />
        </group>
      </group>
    </group>
  )
}

/* ───────── 주인공 3D 모델 (kid.glb) ─────────
   뒷모습이 카메라 쪽을 향하도록 모델 정면을 +z(진행 방향)에 맞춤.
   애니메이션 클립이 있으면 걷기/대기 자동 재생, 없으면 몸 전체로 통통 걷기 연출.
   파일이 없으면 기존 도형 캐릭터(Child)로 대체 */
function KidMotion({ fit, outfit, children }) {
  const g = useRef()
  const hasClips = useClips(fit, () => world.player.speed)
  // 반바지 색: 이름에 short/pant/bottom 이 들어간 재질만 물들임
  useMemo(() => {
    fit.object.traverse((o) => {
      if (!o.isMesh) return
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      mats.forEach((m) => {
        if (m && /short|pant|bottom|trouser/i.test(`${m.name} ${o.name}`) && m.color) m.color.set(OUTFITS[outfit].shorts)
      })
    })
  }, [fit, outfit])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const p = world.player
    const s = p.speed
    const sit = getState().sitting
    const k = Math.min(1, dt * 10)
    const bob = hasClips ? 0 : Math.abs(Math.sin(t * 11)) * 0.04 * s
    g.current.position.y += ((sit ? -0.16 : 0) + p.sitY * S + bob - g.current.position.y) * k
    g.current.rotation.z = hasClips ? 0 : Math.sin(t * 11) * 0.06 * s
    g.current.rotation.x = sit ? 0 : s * 0.05
  })
  return <group ref={g}>{children}</group>
}

export function KidAvatar({ outfit }) {
  return (
    <SafeModel name="kid" fallback={<Child outfit={outfit} />} noPrimitive>
      {(fit) =>
        fit.loaded ? (
          <>
            <Blob />
            <KidMotion fit={fit} outfit={outfit}>
              <primitive object={fit.object} />
              {/* 뒷모습 모델 앞면: 살구색 얼굴 + ^ ^ 눈 + 볼터치 */}
              <FacePatch patch={fit.patch} />
            </KidMotion>
          </>
        ) : null
      }
    </SafeModel>
  )
}
