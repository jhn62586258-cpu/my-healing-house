import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OUTFITS, world } from '../store'
import { plaid } from './textures'

const SKIN = '#ffd8b5'
const HAIR = '#5b3b2a'
const KNIT = '#fff3dc'

function useOutfitMats(outfit) {
  return useMemo(() => {
    const o = OUTFITS[outfit]
    return {
      pants: new THREE.MeshStandardMaterial({ map: plaid(o.pants, o.line, o.line2, [2, 2]), roughness: 1 }),
      sock: new THREE.MeshStandardMaterial({ color: o.sock, roughness: 1 }),
    }
  }, [outfit])
}

/* 한쪽 다리: 체크 수면바지 + 보송 양말 (힙 기준 아래로 뻗음, 앞쪽 +z) */
function LegMesh({ mats, footRef }) {
  const puffs = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        return [Math.cos(a) * 0.082, -0.335, Math.sin(a) * 0.082]
      }),
    []
  )
  return (
    <>
      <mesh position={[0, -0.17, 0]} material={mats.pants}>
        <cylinderGeometry args={[0.085, 0.095, 0.36, 18]} />
      </mesh>
      <mesh position={[0, -0.37, 0]} material={mats.sock}>
        <cylinderGeometry args={[0.072, 0.078, 0.1, 14]} />
      </mesh>
      {puffs.map((p, i) => (
        <mesh key={i} position={p} material={mats.sock}>
          <sphereGeometry args={[0.024, 8, 8]} />
        </mesh>
      ))}
      <mesh ref={footRef} position={[0, -0.45, 0.05]} scale={[1, 0.66, 1.6]} material={mats.sock}>
        <sphereGeometry args={[0.09, 16, 12]} />
      </mesh>
    </>
  )
}

/* 3인칭 캐릭터 */
export function Child({ outfit }) {
  const mats = useOutfitMats(outfit)
  const upper = useRef()
  const legL = useRef()
  const legR = useRef()
  const armL = useRef()
  const armR = useRef()
  const footL = useRef()
  const footR = useRef()
  const head = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const m = world.player.speed
    const sw = Math.sin(t * 9) * 0.7 * m
    legL.current.rotation.x = sw
    legR.current.rotation.x = -sw
    armL.current.rotation.x = -sw * 0.8
    armR.current.rotation.x = sw * 0.8
    upper.current.position.y = Math.abs(Math.sin(t * 9)) * 0.035 * m
    upper.current.rotation.z = Math.sin(t * 9) * 0.04 * m
    head.current.rotation.z = Math.sin(t * 1.7) * 0.05
    const idle = 1 - m
    footL.current.scale.set(1, 0.66, 1.6 + Math.sin(t * 5) * 0.09 * idle)
    footR.current.scale.set(1, 0.66, 1.6 + Math.sin(t * 5 + 1.7) * 0.09 * idle)
  })

  return (
    <group>
      {/* 바닥 그림자 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.28, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
      </mesh>

      <group ref={legL} position={[-0.105, 0.5, 0]}>
        <LegMesh mats={mats} footRef={footL} />
      </group>
      <group ref={legR} position={[0.105, 0.5, 0]}>
        <LegMesh mats={mats} footRef={footR} />
      </group>

      <group ref={upper}>
        {/* 몸통 (크림색 니트) */}
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.15, 0.19, 0.42, 20]} />
          <meshStandardMaterial color={KNIT} roughness={1} />
        </mesh>
        {/* 팔 */}
        <group ref={armL} position={[-0.215, 0.9, 0]}>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.055, 0.06, 0.26, 12]} />
            <meshStandardMaterial color={KNIT} roughness={1} />
          </mesh>
          <mesh position={[0, -0.27, 0]}>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshStandardMaterial color={SKIN} roughness={0.8} />
          </mesh>
        </group>
        <group ref={armR} position={[0.215, 0.9, 0]}>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.055, 0.06, 0.26, 12]} />
            <meshStandardMaterial color={KNIT} roughness={1} />
          </mesh>
          <mesh position={[0, -0.27, 0]}>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshStandardMaterial color={SKIN} roughness={0.8} />
          </mesh>
        </group>

        {/* 머리 */}
        <group ref={head} position={[0, 1.1, 0]}>
          <mesh>
            <sphereGeometry args={[0.24, 24, 20]} />
            <meshStandardMaterial color={SKIN} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.03, -0.03]} scale={[1, 0.92, 1]}>
            <sphereGeometry args={[0.255, 24, 20]} />
            <meshStandardMaterial color={HAIR} roughness={1} />
          </mesh>
          {/* 양갈래 똥머리 */}
          <mesh position={[-0.17, 0.21, -0.03]}>
            <sphereGeometry args={[0.085, 14, 12]} />
            <meshStandardMaterial color={HAIR} roughness={1} />
          </mesh>
          <mesh position={[0.17, 0.21, -0.03]}>
            <sphereGeometry args={[0.085, 14, 12]} />
            <meshStandardMaterial color={HAIR} roughness={1} />
          </mesh>
          {/* 눈 */}
          <mesh position={[-0.085, -0.02, 0.212]}>
            <sphereGeometry args={[0.03, 10, 10]} />
            <meshStandardMaterial color="#2a1c16" roughness={0.3} />
          </mesh>
          <mesh position={[0.085, -0.02, 0.212]}>
            <sphereGeometry args={[0.03, 10, 10]} />
            <meshStandardMaterial color="#2a1c16" roughness={0.3} />
          </mesh>
          {/* 볼터치 */}
          <mesh position={[-0.14, -0.07, 0.18]} scale={[1, 0.8, 0.4]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color="#ff9fae" roughness={1} />
          </mesh>
          <mesh position={[0.14, -0.07, 0.18]} scale={[1, 0.8, 0.4]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color="#ff9fae" roughness={1} />
          </mesh>
          {/* 입 */}
          <mesh position={[0, -0.1, 0.222]}>
            <boxGeometry args={[0.05, 0.012, 0.01]} />
            <meshStandardMaterial color="#c76a6a" roughness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/* 1인칭: 시선 아래로 뻗은 수면바지 + 꼼지락 양말 발끝 (앞쪽 +z, 부모가 yaw 회전) */
export function FPLegs({ outfit }) {
  const mats = useOutfitMats(outfit)
  const L = useRef()
  const R = useRef()
  const fL = useRef()
  const fR = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const m = world.player.speed
    const sw = Math.sin(t * 8) * 0.28 * m
    const tilt = 1.28
    L.current.rotation.x = -(tilt + sw)
    R.current.rotation.x = -(tilt - sw)
    const idle = 1 - m
    fL.current.rotation.x = Math.sin(t * 6) * 0.18 * idle
    fR.current.rotation.x = Math.sin(t * 6 + 1.3) * 0.18 * idle
  })

  return (
    <group>
      <group ref={L} position={[-0.12, 0.52, -0.02]}>
        <LegMesh mats={mats} footRef={fL} />
      </group>
      <group ref={R} position={[0.12, 0.52, -0.02]}>
        <LegMesh mats={mats} footRef={fR} />
      </group>
    </group>
  )
}
