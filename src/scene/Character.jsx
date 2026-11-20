import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OUTFITS, world } from '../store'
import { soft } from './parts'

const SKIN = '#ffe2cc'
const HAIR = '#5a4034'
const TEE = '#fffdf8'

const std = (c, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r })
const EYE = new THREE.MeshStandardMaterial({ color: '#3a2a22', roughness: 0.2 })
const WHITE = new THREE.MeshBasicMaterial({ color: '#ffffff' })
const BLUSH = new THREE.MeshStandardMaterial({ color: '#ffa9b6', roughness: 1, transparent: true, opacity: 0.7 })
const MOUTH = new THREE.MeshStandardMaterial({ color: '#d77a7a', roughness: 0.8 })

/* 다정한 얼굴 — 순한 눈매 + 발그레 볼터치. 앞쪽 +z, 머리 반지름 r
   closed: 웃는 반달눈 */
export function Face({ r = 0.24, eyeY = -0.02, closed = false, brows = true }) {
  const ex = r * 0.34
  const ez = (y) => Math.sqrt(Math.max(0, r * r - y * y - ex * ex)) - 0.003
  const blinkRef = useRef([])
  const st = useRef(2 + Math.random() * 2)
  useFrame((_, dt) => {
    if (closed) return
    st.current -= dt
    if (st.current < -0.12) st.current = 2.5 + Math.random() * 3
    const sy = st.current < 0 ? 0.12 : 1
    blinkRef.current.forEach((e) => e && (e.scale.y = sy))
  })
  return (
    <group>
      {[-1, 1].map((s, i) => (
        <group key={s}>
          {closed ? (
            <mesh position={[s * ex, eyeY, ez(eyeY)]} rotation={[0, s * 0.3, 0]} material={EYE}>
              <torusGeometry args={[r * 0.08, r * 0.018, 6, 14, Math.PI]} />
            </mesh>
          ) : (
            <group ref={(el) => (blinkRef.current[i] = el)} position={[s * ex, eyeY, ez(eyeY)]}>
              <mesh scale={[1, 1.22, 0.55]} material={EYE}>
                <sphereGeometry args={[r * 0.105, 16, 12]} />
              </mesh>
              <mesh position={[r * 0.03, r * 0.045, r * 0.05]} material={WHITE}>
                <sphereGeometry args={[r * 0.035, 8, 6]} />
              </mesh>
              <mesh position={[-r * 0.025, -r * 0.035, r * 0.05]} material={WHITE}>
                <sphereGeometry args={[r * 0.016, 6, 6]} />
              </mesh>
            </group>
          )}
          {/* 순하게 처진 눈썹 */}
          {brows && (
            <mesh position={[s * ex, eyeY + r * 0.25, ez(eyeY + r * 0.25) + 0.002]} rotation={[0, 0, s * 0.18]} scale={[1, 0.35, 0.4]}>
              <capsuleGeometry args={[r * 0.022, r * 0.12, 4, 8]} />
              <meshStandardMaterial color="#6a4a3a" />
            </mesh>
          )}
          {/* 발그레 볼터치 */}
          <mesh position={[s * r * 0.58, eyeY - r * 0.3, ez(eyeY - r * 0.3) - r * 0.2]} rotation={[0, s * 0.55, 0]} scale={[1, 0.62, 0.3]} material={BLUSH}>
            <sphereGeometry args={[r * 0.2, 14, 10]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, eyeY - r * 0.36, ez(eyeY - r * 0.36) + 0.002]} rotation={[0.2, 0, Math.PI]} material={MOUTH}>
        <torusGeometry args={[r * 0.085, r * 0.022, 6, 14, Math.PI]} />
      </mesh>
    </group>
  )
}

/* 그림자 (따뜻한 갈색, 은은하게) */
const Blob = ({ r = 0.26 }) => (
  <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} raycast={() => null} userData={{ noCast: true }}>
    <circleGeometry args={[r, 24]} />
    <meshBasicMaterial color="#8a6a4a" transparent opacity={0.14} depthWrite={false} />
  </mesh>
)

/* ───────── 주인공: 바가지머리 초등학생 (흰 반팔 + 반바지) ───────── */
function useKidMats(outfit) {
  return useMemo(
    () => ({
      shorts: std(soft(OUTFITS[outfit].shorts)),
      tee: std(TEE, 0.9),
      skin: std(SKIN, 0.75),
      hair: new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.65, side: THREE.DoubleSide }),
      sock: std('#ffffff'),
      shoe: std('#fbf7ee', 0.6),
      sole: std(soft(OUTFITS[outfit].shorts), 0.7),
    }),
    [outfit]
  )
}

function KidLeg({ m }) {
  return (
    <>
      <mesh position={[0, -0.05, 0]} material={m.shorts}>
        <capsuleGeometry args={[0.088, 0.05, 6, 14]} />
      </mesh>
      <mesh position={[0, -0.2, 0]} material={m.skin}>
        <capsuleGeometry args={[0.05, 0.12, 6, 12]} />
      </mesh>
      <mesh position={[0, -0.31, 0]} material={m.sock}>
        <capsuleGeometry args={[0.052, 0.02, 4, 12]} />
      </mesh>
      <group position={[0, -0.37, 0.03]}>
        <mesh material={m.shoe} scale={[1, 0.66, 1.4]}>
          <sphereGeometry args={[0.075, 16, 12]} />
        </mesh>
        <mesh material={m.sole} position={[0, -0.03, 0]} scale={[1.02, 0.28, 1.45]}>
          <sphereGeometry args={[0.076, 16, 8]} />
        </mesh>
      </group>
    </>
  )
}

/* 바가지 머리: 뒤·옆은 귀 아래까지, 앞은 눈썹 위 일자 앞머리 (둥근 테두리) */
function BowlHair({ m, r = 0.27 }) {
  const R = r * 1.07
  const front = Math.PI / 2
  const fw = 1.75
  const edge = 1.32
  return (
    <group position={[0, 0.02, -0.005]}>
      <mesh material={m}>
        <sphereGeometry args={[R, 32, 20, front + fw / 2, Math.PI * 2 - fw, 0, 2.0]} />
      </mesh>
      <mesh material={m}>
        <sphereGeometry args={[R, 32, 20, front - fw / 2, fw, 0, edge]} />
      </mesh>
      {/* 앞머리 끝 / 뒷머리 끝 둥근 테 */}
      <mesh material={m} position={[0, R * Math.cos(edge), 0]} rotation={[Math.PI / 2, 0, Math.PI / 2 - fw / 2]}>
        <torusGeometry args={[R * Math.sin(edge), 0.028, 8, 32, fw]} />
      </mesh>
      <mesh material={m} position={[0, R * Math.cos(2.0), 0]} rotation={[Math.PI / 2, 0, Math.PI / 2 + fw / 2]}>
        <torusGeometry args={[R * Math.sin(2.0), 0.03, 8, 40, Math.PI * 2 - fw]} />
      </mesh>
      {/* 정수리 바람개비 머리카락 */}
      <mesh material={m} position={[0.02, R + 0.02, -0.04]} rotation={[0.3, 0, 0.5]}>
        <torusGeometry args={[0.04, 0.012, 6, 12, Math.PI * 1.3]} />
      </mesh>
    </group>
  )
}

export function Child({ outfit }) {
  const m = useKidMats(outfit)
  const upper = useRef()
  const legL = useRef()
  const legR = useRef()
  const armL = useRef()
  const armR = useRef()
  const head = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const s = world.player.speed
    const sw = Math.sin(t * 10) * 0.7 * s
    legL.current.rotation.x = sw
    legR.current.rotation.x = -sw
    armL.current.rotation.x = -sw * 0.9
    armR.current.rotation.x = sw * 0.9
    armL.current.rotation.z = -0.15 - s * 0.05
    armR.current.rotation.z = 0.15 + s * 0.05
    upper.current.position.y = Math.abs(Math.sin(t * 10)) * 0.03 * s + Math.sin(t * 2) * 0.006
    head.current.rotation.z = Math.sin(t * 1.6) * 0.06 * (1 - s)
    head.current.rotation.x = Math.sin(t * 10) * 0.03 * s
  })

  return (
    <group>
      <Blob />
      <group ref={legL} position={[-0.085, 0.42, 0]}>
        <KidLeg m={m} />
      </group>
      <group ref={legR} position={[0.085, 0.42, 0]}>
        <KidLeg m={m} />
      </group>
      <group ref={upper}>
        {/* 반바지 허리 */}
        <mesh position={[0, 0.48, 0]} material={m.shorts}>
          <capsuleGeometry args={[0.165, 0.04, 6, 18]} />
        </mesh>
        {/* 통통한 흰 반팔 티 */}
        <mesh position={[0, 0.66, 0]} material={m.tee} scale={[1, 1, 0.9]}>
          <capsuleGeometry args={[0.165, 0.16, 8, 20]} />
        </mesh>
        {[
          [armL, -1],
          [armR, 1],
        ].map(([ref, s]) => (
          <group key={s} ref={ref} position={[s * 0.17, 0.78, 0]}>
            <mesh position={[s * 0.02, -0.04, 0]} material={m.tee}>
              <sphereGeometry args={[0.07, 14, 10]} />
            </mesh>
            <mesh position={[s * 0.03, -0.15, 0]} material={m.skin}>
              <capsuleGeometry args={[0.04, 0.1, 6, 10]} />
            </mesh>
            <mesh position={[s * 0.03, -0.24, 0]} material={m.skin}>
              <sphereGeometry args={[0.048, 12, 10]} />
            </mesh>
          </group>
        ))}
        {/* 큰 머리 (아기자기한 2.5등신) */}
        <group ref={head} position={[0, 1.08, 0]}>
          <mesh material={m.skin}>
            <sphereGeometry args={[0.27, 32, 24]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.265, -0.04, 0]} scale={[0.5, 1, 0.8]} material={m.skin}>
              <sphereGeometry args={[0.055, 12, 10]} />
            </mesh>
          ))}
          <BowlHair m={m.hair} r={0.27} />
          <Face r={0.27} eyeY={-0.04} />
        </group>
      </group>
    </group>
  )
}

/* 1인칭: 시선 아래 보이는 반바지 + 다리 + 운동화 */
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
    <group position={[0, 0, 0.12]}>
      <group ref={L} position={[-0.1, 0.42, 0]}>
        <KidLeg m={m} />
      </group>
      <group ref={R} position={[0.1, 0.42, 0]}>
        <KidLeg m={m} />
      </group>
    </group>
  )
}

/* ───────── 뽀글머리 엄마 (앞치마) ───────── */
export function Mom({ armRef, headRef }) {
  const perm = useMemo(() => {
    // 동글동글 구름 같은 파마머리 (정돈된 배치)
    const pts = []
    const R = 0.205
    for (const [th, n, rr] of [
      [0.15, 1, 0.09],
      [0.55, 7, 0.085],
      [1.0, 10, 0.08],
      [1.45, 11, 0.075],
      [1.85, 10, 0.07],
    ]) {
      for (let i = 0; i < n; i++) {
        const ph = (i / n) * Math.PI * 2 + th
        const x = Math.sin(th) * Math.cos(ph)
        const y = Math.cos(th)
        const z = Math.sin(th) * Math.sin(ph)
        if (z > 0.35 && th > 0.9) continue // 얼굴은 비우기
        pts.push([x * R, y * R + 0.03, z * R - 0.01, rr])
      }
    }
    return pts
  }, [])
  const hair = useMemo(() => std('#6a4c40', 0.85), [])
  const shirt = useMemo(() => std(soft('#9d86c4'), 0.9), [])
  const apron = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    g.fillStyle = '#ffd0d8'
    g.fillRect(0, 0, 64, 64)
    g.fillStyle = '#ffffff'
    for (let y = 0; y < 64; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < 64; x += 16) {
      g.beginPath()
      g.arc(x + 7, y + 7, 3.5, 0, Math.PI * 2)
      g.fill()
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(3, 3)
    t.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })
  }, [])
  const skin = useMemo(() => std(SKIN, 0.75), [])
  return (
    <group>
      <Blob r={0.3} />
      {/* 통통한 바지 다리 + 슬리퍼 */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.1, 0.38, 0]}>
            <capsuleGeometry args={[0.085, 0.5, 6, 14]} />
            <meshStandardMaterial color={soft('#6f6290')} roughness={0.9} />
          </mesh>
          <mesh position={[s * 0.1, 0.04, 0.05]} scale={[1, 0.45, 1.5]}>
            <sphereGeometry args={[0.085, 14, 10]} />
            <meshStandardMaterial color="#f7b4be" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* 둥근 몸통 */}
      <mesh position={[0, 1.07, 0]} material={shirt} scale={[1, 1, 0.85]}>
        <capsuleGeometry args={[0.24, 0.32, 8, 20]} />
      </mesh>
      {/* 앞치마 (둥근 판) */}
      <mesh position={[0, 0.92, 0.2]} rotation={[0.1, 0, 0]} material={apron} scale={[1, 1, 0.25]}>
        <capsuleGeometry args={[0.2, 0.32, 6, 16]} />
      </mesh>
      <mesh position={[0, 1.25, 0.2]} material={apron} scale={[1, 1, 0.25]}>
        <capsuleGeometry args={[0.12, 0.06, 6, 14]} />
      </mesh>
      {/* 왼팔 */}
      <group position={[-0.26, 1.3, 0]} rotation={[-0.5, 0, 0.18]}>
        <mesh position={[0, -0.19, 0]} material={shirt}>
          <capsuleGeometry args={[0.06, 0.26, 6, 12]} />
        </mesh>
        <mesh position={[0, -0.38, 0]} material={skin}>
          <sphereGeometry args={[0.055, 12, 10]} />
        </mesh>
      </group>
      {/* 오른팔 (국자 젓기) */}
      <group ref={armRef} position={[0.26, 1.3, 0]} rotation={[-0.9, 0, -0.15]}>
        <mesh position={[0, -0.19, 0]} material={shirt}>
          <capsuleGeometry args={[0.06, 0.26, 6, 12]} />
        </mesh>
        <mesh position={[0, -0.38, 0]} material={skin}>
          <sphereGeometry args={[0.055, 12, 10]} />
        </mesh>
        <mesh position={[0, -0.47, 0.05]} rotation={[0.6, 0, 0]}>
          <capsuleGeometry args={[0.013, 0.26, 4, 6]} />
          <meshStandardMaterial color="#e2ddd2" metalness={0.3} roughness={0.4} />
        </mesh>
      </group>
      {/* 머리 */}
      <group ref={headRef} position={[0, 1.62, 0]}>
        <mesh material={skin}>
          <sphereGeometry args={[0.2, 28, 20]} />
        </mesh>
        {perm.map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} material={hair}>
            <sphereGeometry args={[r, 12, 10]} />
          </mesh>
        ))}
        <Face r={0.2} eyeY={-0.02} closed brows={false} />
      </group>
    </group>
  )
}

/* ───────── 소파에 기대 TV 보는 아빠 (로컬 +z = 정면) ───────── */
export function Dad({ headRef, chestRef }) {
  const shirt = useMemo(() => std(soft('#7f9fbe'), 0.9), [])
  const pants = useMemo(() => std(soft('#6c6a78'), 0.9), [])
  const skin = useMemo(() => std('#f8d6bc', 0.75), [])
  return (
    <group>
      {/* 허벅지·종아리 (앉은 자세) */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.12, 0.62, 0.15]} rotation={[Math.PI / 2, 0, 0]} material={pants}>
            <capsuleGeometry args={[0.09, 0.3, 6, 14]} />
          </mesh>
          <mesh position={[s * 0.12, 0.38, 0.38]} material={pants}>
            <capsuleGeometry args={[0.075, 0.3, 6, 12]} />
          </mesh>
          <mesh position={[s * 0.12, 0.17, 0.44]} scale={[1, 0.55, 1.5]}>
            <sphereGeometry args={[0.075, 12, 10]} />
            <meshStandardMaterial color="#fbf7ee" roughness={1} />
          </mesh>
        </group>
      ))}
      {/* 상체 (뒤로 기댐, 둥근 배) */}
      <group ref={chestRef} position={[0, 0.66, -0.05]} rotation={[-0.32, 0, 0]}>
        <mesh position={[0, 0.27, 0]} material={shirt}>
          <capsuleGeometry args={[0.24, 0.3, 8, 20]} />
        </mesh>
        <mesh position={[0, 0.14, 0.08]} scale={[1, 0.85, 0.85]} material={shirt}>
          <sphereGeometry args={[0.24, 18, 14]} />
        </mesh>
        {/* 팔: 한쪽은 소파 등받이, 한쪽은 리모컨 */}
        <group position={[-0.28, 0.5, 0]} rotation={[0, 0, 1.2]}>
          <mesh position={[0, -0.18, 0]} material={shirt}>
            <capsuleGeometry args={[0.065, 0.28, 6, 12]} />
          </mesh>
        </group>
        <group position={[0.28, 0.48, 0]} rotation={[-1.1, 0, -0.2]}>
          <mesh position={[0, -0.18, 0]} material={shirt}>
            <capsuleGeometry args={[0.065, 0.28, 6, 12]} />
          </mesh>
          <mesh position={[0, -0.38, 0]} material={skin}>
            <sphereGeometry args={[0.06, 12, 10]} />
          </mesh>
          <mesh position={[0, -0.42, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.025, 0.12, 4, 8]} />
            <meshStandardMaterial color="#8a8494" />
          </mesh>
        </group>
        <group ref={headRef} position={[0, 0.8, 0.02]} rotation={[0.25, 0, 0]}>
          <mesh material={skin}>
            <sphereGeometry args={[0.215, 28, 20]} />
          </mesh>
          {/* 짧고 단정한 머리 (살짝 희끗) */}
          <mesh position={[0, 0.045, -0.025]} scale={[1.04, 0.86, 1.04]}>
            <sphereGeometry args={[0.215, 28, 14, 0, Math.PI * 2, 0, 1.5]} />
            <meshStandardMaterial color="#6a6260" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.21, -0.02, 0]} scale={[0.5, 1, 0.8]} material={skin}>
              <sphereGeometry args={[0.05, 10, 8]} />
            </mesh>
          ))}
          <Face r={0.215} eyeY={-0.005} />
          {/* 동글 코 */}
          <mesh position={[0, -0.04, 0.21]}>
            <sphereGeometry args={[0.03, 10, 8]} />
            <meshStandardMaterial color="#f3c4a6" />
          </mesh>
        </group>
      </group>
    </group>
  )
}
