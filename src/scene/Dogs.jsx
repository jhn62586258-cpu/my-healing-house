import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { soft } from './parts'

const mat = (c, r = 0.62) => new THREE.MeshStandardMaterial({ color: c, roughness: r })

/* 말랑말랑 강아지 — 통통한 캡슐 몸통 + 동그란 머리 + 까맣고 큰 눈 + 분홍 코
   ref.current.wag(초) : 꼬리 살랑 + 깡총
   pose: 'lie' 엎드림 | 'sit' 앉음 | 'stand' 서 있음
   kind: 'poodle' | 'jindo'                                           */
export const Dog = forwardRef(function Dog({ color = '#e9c58e', light, pose = 'stand', kind = 'jindo', size = 1, leash }, ref) {
  const tail = useRef()
  const head = useRef()
  const body = useRef()
  const hopper = useRef()
  const st = useRef({ wagUntil: 0, hop: 0, blink: 0 })
  const eyes = useRef([])
  const m = useMemo(
    () => ({
      fur: mat(soft(color)),
      light: mat(soft(light || color)),
      eye: new THREE.MeshStandardMaterial({ color: '#2a2220', roughness: 0.15 }),
      white: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      nose: mat('#7a4a48', 0.3),
      blush: new THREE.MeshStandardMaterial({ color: '#e89a96', roughness: 1, transparent: true, opacity: 0.35 }),
      collar: mat('#a8352b', 0.5),
    }),
    [color, light]
  )
  useImperativeHandle(ref, () => ({
    wag(sec = 2) {
      st.current.wagUntil = performance.now() + sec * 1000
      st.current.hop = 1
    },
  }))

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const s = st.current
    const wag = performance.now() < s.wagUntil
    s.hop = Math.max(0, s.hop - dt * 2.5)
    tail.current.rotation.z = Math.sin(t * (wag ? 20 : 2.5)) * (wag ? 0.7 : 0.18)
    head.current.rotation.z = Math.sin(t * 0.9) * 0.07 + (wag ? Math.sin(t * 8) * 0.08 : 0)
    head.current.rotation.x = (pose === 'lie' && !wag ? 0.12 : -0.05) + Math.sin(t * 0.7) * 0.03
    const breathe = 1 + Math.sin(t * 2.2) * 0.03
    body.current.scale.set(breathe, 1, breathe)
    hopper.current.position.y = Math.sin(s.hop * Math.PI) * 0.12
    // 깜빡깜빡
    s.blink -= dt
    if (s.blink < -0.12) s.blink = 2 + Math.random() * 3
    const sy = s.blink < 0 ? 0.15 : 1
    eyes.current.forEach((e) => e && (e.scale.y = sy))
  })

  const lie = pose === 'lie'
  const sit = pose === 'sit'
  const poodle = kind === 'poodle'
  const bodyPos = lie ? [0, 0.17, 0] : sit ? [0, 0.3, -0.06] : [0, 0.36, 0]
  const bodyRot = lie ? [Math.PI / 2, 0, 0] : sit ? [Math.PI / 2 - 0.85, 0, 0] : [Math.PI / 2, 0, 0]
  const headPos = lie ? [0, 0.25, 0.36] : sit ? [0, 0.7, 0.14] : [0, 0.62, 0.3]

  return (
    <group scale={size}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} raycast={() => null} userData={{ noCast: true }}>
        <circleGeometry args={[0.36, 24]} />
        <meshBasicMaterial color="#8a6a4a" transparent opacity={0.13} depthWrite={false} />
      </mesh>
      <group ref={hopper}>
        {/* 몸통 (캡슐) */}
        <mesh ref={body} position={bodyPos} rotation={bodyRot} material={m.fur}>
          <capsuleGeometry args={[0.17, 0.3, 8, 18]} />
        </mesh>
        <mesh position={[0, bodyPos[1] - 0.05, bodyPos[2] + (sit ? 0.09 : 0.12)]} rotation={bodyRot} scale={[0.8, 0.8, 0.7]} material={m.light}>
          <capsuleGeometry args={[0.13, 0.16, 6, 14]} />
        </mesh>

        {/* 다리 (짧은 캡슐) */}
        {lie
          ? [-1, 1].map((sx) => (
              <mesh key={sx} position={[sx * 0.1, 0.07, 0.36]} rotation={[Math.PI / 2, 0, 0]} material={m.light}>
                <capsuleGeometry args={[0.055, 0.14, 4, 10]} />
              </mesh>
            ))
          : sit
            ? [
                ...[-1, 1].map((sx) => (
                  <mesh key={'f' + sx} position={[sx * 0.08, 0.15, 0.1]} material={m.light}>
                    <capsuleGeometry args={[0.055, 0.2, 4, 10]} />
                  </mesh>
                )),
                ...[-1, 1].map((sx) => (
                  <mesh key={'b' + sx} position={[sx * 0.14, 0.1, -0.12]} scale={[0.75, 0.6, 1.1]} material={m.fur}>
                    <sphereGeometry args={[0.13, 16, 12]} />
                  </mesh>
                )),
              ]
            : [
                [-0.09, 0.2],
                [0.09, 0.2],
                [-0.09, -0.2],
                [0.09, -0.2],
              ].map(([x, z], i) => (
                <mesh key={i} position={[x, 0.13, z]} material={m.light}>
                  <capsuleGeometry args={[0.055, 0.14, 4, 10]} />
                </mesh>
              ))}

        {/* 꼬리 */}
        <group ref={tail} position={lie ? [0, 0.22, -0.32] : sit ? [0, 0.14, -0.26] : [0, 0.46, -0.3]}>
          {poodle ? (
            <mesh position={[0, 0.08, -0.04]} material={m.fur}>
              <sphereGeometry args={[0.08, 16, 12]} />
            </mesh>
          ) : (
            <mesh position={[0, 0.1, -0.02]} rotation={[0.2, Math.PI / 2, 0]} material={m.fur}>
              <torusGeometry args={[0.07, 0.042, 10, 18, Math.PI * 1.5]} />
            </mesh>
          )}
        </group>

        {/* 머리 */}
        <group ref={head} position={headPos} scale={1.18}>
          <mesh material={m.fur}>
            <sphereGeometry args={[0.19, 28, 20]} />
          </mesh>
          {poodle && (
            <mesh position={[0, 0.14, -0.02]} scale={[1, 0.75, 1]} material={m.fur}>
              <sphereGeometry args={[0.12, 18, 14]} />
            </mesh>
          )}
          {/* 주둥이 */}
          <mesh position={[0, -0.06, 0.15]} scale={[1.15, 0.8, 0.85]} material={m.light}>
            <sphereGeometry args={[0.085, 16, 12]} />
          </mesh>
          {/* 분홍 코 */}
          <mesh position={[0, -0.025, 0.225]} scale={[1.3, 0.9, 0.9]} material={m.nose}>
            <sphereGeometry args={[0.028, 12, 10]} />
          </mesh>
          {/* 입 */}
          <mesh position={[0, -0.075, 0.215]} rotation={[0.3, 0, Math.PI]} material={m.eye}>
            <torusGeometry args={[0.022, 0.006, 6, 12, Math.PI]} />
          </mesh>
          {[-1, 1].map((sx) => (
            <group key={sx}>
              {/* 까맣고 큰 눈 + 반짝 */}
              <group ref={(el) => (eyes.current[sx > 0 ? 1 : 0] = el)} position={[sx * 0.085, 0.035, 0.158]}>
                <mesh scale={[1, 1.1, 0.6]} material={m.eye}>
                  <sphereGeometry args={[0.042, 16, 12]} />
                </mesh>
                <mesh position={[sx * 0.012 + 0.008, 0.017, 0.022]} material={m.white}>
                  <sphereGeometry args={[0.013, 8, 6]} />
                </mesh>
              </group>
              {/* 볼터치 */}
              <mesh position={[sx * 0.13, -0.045, 0.12]} scale={[1, 0.6, 0.35]} material={m.blush}>
                <sphereGeometry args={[0.04, 12, 8]} />
              </mesh>
              {/* 귀 */}
              {kind === 'poodle' ? (
                <mesh position={[sx * 0.17, -0.03, -0.01]} rotation={[0, 0, sx * 0.2]} scale={[0.65, 1.25, 0.85]} material={m.fur}>
                  <sphereGeometry args={[0.085, 16, 12]} />
                </mesh>
              ) : (
                <mesh position={[sx * 0.105, 0.17, -0.01]} rotation={[0, 0, -sx * 0.32]} scale={[0.75, 1.2, 0.45]} material={m.fur}>
                  <sphereGeometry args={[0.065, 14, 10]} />
                </mesh>
              )}
            </group>
          ))}
          {leash && (
            <mesh position={[0, -0.15, -0.03]} rotation={[Math.PI / 2 + 0.25, 0, 0]} material={m.collar}>
              <torusGeometry args={[0.105, 0.022, 8, 20]} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  )
})
