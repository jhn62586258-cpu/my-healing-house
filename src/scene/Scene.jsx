import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
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
  fog: new THREE.Color('#f7ecdc'),
  hemiSky: new THREE.Color('#dcefff'),
  hemiGround: new THREE.Color('#f6dfc2'),
  hemi: 0.95,
  key: 2.6,
  keyC: new THREE.Color('#ffdcae'),
  rim: 0.5,
  amb: 0.12,
  porch: 0,
}
const NIGHT = {
  fog: new THREE.Color('#9f9cbc'),
  hemiSky: new THREE.Color('#a9b3dc'),
  hemiGround: new THREE.Color('#8a7a8c'),
  hemi: 0.75,
  key: 0.35,
  keyC: new THREE.Color('#c7c3ec'),
  rim: 0.35,
  amb: 0.2,
  porch: 5,
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
    scene.fog = new THREE.Fog('#f7ecdc', 30, 85)
    scene.add(target)
    target.position.set(-1, 0, -0.5)
    key.current.target = target
    return () => scene.remove(target)
  }, [scene, target])

  useEffect(() => {
    scene.background = rainOn ? sky.night : sky.day
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
      <hemisphereLight ref={hemi} args={['#dcefff', '#f6dfc2', 0.95]} />
      <ambientLight ref={amb} color="#fff3e2" intensity={0.12} />
      {/* 키 라이트: 남서쪽에서 비스듬히 들어오는 오후 4시 햇살 */}
      <directionalLight
        ref={key}
        position={[-11, 11, 11]}
        intensity={2.6}
        color="#ffdcae"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={6}
      />
      {/* 림 라이트: 뒤쪽 하늘빛 */}
      <directionalLight ref={rim} position={[8, 9, -12]} intensity={0.55} color="#cfe2ff" />
      {/* 처마 백열등 (저녁에 켜짐) */}
      <pointLight ref={porch} position={[-0.4, 2.55, 2.0]} color="#ffc67a" intensity={0} distance={7} decay={1.6} />
      <mesh ref={bulb} position={[-0.4, 2.62, 2.0]} raycast={() => null} userData={{ noCast: true }}>
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
    t.current = 1.2
    scene.traverse((o) => {
      if (!o.isMesh) return
      const m = Array.isArray(o.material) ? o.material[0] : o.material
      const flat = FLAT.has(o.geometry?.type)
      o.castShadow = !flat && !o.userData.noCast && !(m && m.transparent) && !(m && m.isMeshBasicMaterial)
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
      <Player />
      <House />
      <Living />
      <Kitchen />
      <BackRoom />
      <Yard />
      <Rain />
    </>
  )
}
