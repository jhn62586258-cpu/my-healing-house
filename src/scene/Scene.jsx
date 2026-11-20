import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore, S } from '../store'
import Player, { LookControls } from './Player'
import House from './House'
import Living from './Living'
import Kitchen from './Kitchen'
import BackRoom from './BackRoom'
import Yard from './Yard'
import Rain from './Rain'
import { skyTex } from './textures'

/* 맑은 오후 4시 (기본)  ↔  비 오는 저녁 (토글) */
const DAY = {
  fog: new THREE.Color('#e9dcc4'),
  hemiSky: new THREE.Color('#cfe0f0'),
  hemiGround: new THREE.Color('#e2b98a'), // 마루에서 반사돼 올라가는 따뜻한 빛 → 서까래 밝힘
  hemi: 1.05,
  key: 3.4,
  keyC: new THREE.Color('#ffc98a'),
  rim: 0.35,
  amb: 0.18,
  porch: 0,
}
const NIGHT = {
  fog: new THREE.Color('#3a3d52'),
  hemiSky: new THREE.Color('#5a6488'),
  hemiGround: new THREE.Color('#2e2a2c'),
  hemi: 0.45,
  key: 0.18,
  keyC: new THREE.Color('#9aa6d8'),
  rim: 0.25,
  amb: 0.1,
  porch: 4,
}

function Lighting() {
  const rainOn = useStore((s) => s.rainOn)
  const scene = useThree((s) => s.scene)
  const hemi = useRef()
  const key = useRef()
  const rim = useRef()
  const amb = useRef()
  const porch = useRef()
  const bulb = useRef()
  const target = useMemo(() => new THREE.Object3D(), [])
  const sky = useMemo(() => ({ day: skyTex(false), night: skyTex(true) }), [])

  useEffect(() => {
    scene.fog = new THREE.Fog('#e9dcc4', 30, 90)
    scene.add(target)
    target.position.set(-1.5 * S, 0, -1.5 * S)
    key.current.target = target
    return () => scene.remove(target)
  }, [scene, target])

  useEffect(() => {
    scene.background = rainOn ? sky.night : sky.day
    scene.backgroundIntensity = 1
  }, [rainOn, scene, sky])

  useFrame((_, dt) => {
    if (!scene.fog || !hemi.current) return
    const T = rainOn ? NIGHT : DAY
    const k = Math.min(1, dt * 1.6)
    scene.fog.color.lerp(T.fog, k)
    hemi.current.color.lerp(T.hemiSky, k)
    hemi.current.groundColor.lerp(T.hemiGround, k)
    hemi.current.intensity += (T.hemi - hemi.current.intensity) * k
    key.current.intensity += (T.key - key.current.intensity) * k
    key.current.color.lerp(T.keyC, k)
    rim.current.intensity += (T.rim - rim.current.intensity) * k
    amb.current.intensity += (T.amb - amb.current.intensity) * k
    porch.current.intensity += (T.porch - porch.current.intensity) * k
    bulb.current.visible = porch.current.intensity > 0.3
    bulb.current.material.emissiveIntensity = 0.3 + porch.current.intensity * 0.4
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#cfe0f0', '#e2b98a', 1.05]} />
      <ambientLight ref={amb} color="#fff3e2" intensity={0.18} />
      {/* 키 라이트: 서쪽 통유리로 낮게 길게 들어오는 오후 4시 햇살 */}
      <directionalLight
        ref={key}
        position={[-16.5, 7.2, 3.5]}
        intensity={3.4}
        color="#ffc98a"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10.5}
        shadow-camera-bottom={-10.5}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={4}
      />
      {/* 림 라이트: 뒤쪽 하늘빛 */}
      <directionalLight ref={rim} position={[10, 9, -8]} intensity={0.35} color="#cfe2ff" />
      {/* 처마 백열등 (저녁에 켜짐) */}
      <pointLight ref={porch} position={[-5.6 * S, 2.55 * S, 1.2 * S]} color="#ffc67a" intensity={0} distance={7} decay={1.6} />
      <mesh ref={bulb} position={[-5.6 * S, 2.68 * S, 1.2 * S]} raycast={() => null} userData={{ noCast: true }}>
        <sphereGeometry args={[0.06, 14, 10]} />
        <meshStandardMaterial color="#fff2d6" emissive="#ffc67a" emissiveIntensity={0.3} />
      </mesh>
    </>
  )
}

/* 그림자: 불투명한 물체만 드리우고, 모두 받기 (주기적으로 갱신) */
const FLAT = new Set(['PlaneGeometry', 'CircleGeometry', 'RingGeometry', 'ShapeGeometry'])
function ShadowSetup() {
  const scene = useThree((s) => s.scene)
  const t = useRef(0)
  useFrame((_, dt) => {
    t.current -= dt
    if (t.current > 0) return
    t.current = 0.5
    scene.traverse((o) => {
      if (!o.isMesh) return
      if (o.userData.forceShadow) {
        o.castShadow = true
        o.receiveShadow = true
        return
      }
      const m = Array.isArray(o.material) ? o.material[0] : o.material
      const flat = FLAT.has(o.geometry?.type)
      o.castShadow = !flat && !o.userData.noCast && !(m && m.transparent) && !(m && m.isMeshBasicMaterial) && !(m && m.toneMapped === false)
      o.receiveShadow = !(m && m.isMeshBasicMaterial)
    })
  })
  return null
}

export default function Scene() {
  return (
    <>
      <Lighting />
      <ShadowSetup />
      <LookControls />
      {/* 집·마당 공간 전체를 S(0.78)배로 아담하게 — 가구·캐릭터는 SafeModel/Real 이 실제 크기로 유지 */}
      <group scale={S}>
        <Player />
        <House />
        <Living />
        <Kitchen />
        <BackRoom />
        <Yard />
        <Rain />
      </group>
    </>
  )
}
