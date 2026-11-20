/* ─────────────────────────────────────────────────────────────
   외부 3D 모델(.glb / .obj+텍스처) 로더 · 자동 크기 보정 · 바닥 정렬
   - Box3.setFromObject 로 크기 측정 → 목표 크기로 자동 스케일
   - 최하단(min.y)을 y=0 에 맞추고 x/z 중심 정렬 (또는 뒷면을 벽에 붙임)
   - 상판 높이(anchors)는 위에서 아래로 레이캐스트해서 실제 표면을 찾음
   - Suspense + ErrorBoundary : 파일이 없거나 깨져도 기본 도형으로 대체
   ───────────────────────────────────────────────────────────── */
import { Component, Suspense, createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import { S } from '../store'

const BASE = import.meta.env.BASE_URL || '/'
const url = (u) => (u.startsWith('/') ? BASE.replace(/\/$/, '') + u : u)

/* ───────── 모델 배치표 (크기 m · 방향 · 정렬) ─────────
   fit   : 'height' | 'width'(가로·세로 중 긴 쪽) | 'max'
   size  : fit 기준 목표 크기,  maxH / maxW : 상한
   rotY  : 모델 정면을 +z 로 맞추는 보정 회전 (모델마다 다르면 여기만 고치면 됨)
   rotX  : Z-up 으로 저장된 모델 보정 (-Math.PI/2)
   align : 'center'(기본) | 'back' (뒷면을 원점에 → 벽에 붙이기)
   anchors : { 이름: [x, z, 위에서 쏘는 높이] } → 그 지점 표면 높이를 자동 측정
   face  : 눈 없는 OBJ 캐릭터에 ^ ^ 웃는 눈 + 볼터치 부착 (eyeY: 키 대비 눈 높이) */
export const MODELS = {
  // 뒷모습으로 만든 모델이라 앞면에 살구색 얼굴 패치 + ^ ^ 눈 + 볼터치를 덧댐
  kid: { url: '/models/kid.glb', fit: 'height', size: 0.9, facePatch: { y: 0.66, r: 0.15 } },
  mom: { url: '/models/mom.obj', tex: '/models/mom_tex.png', fit: 'height', size: 1.3, face: { eyeY: 0.73, gap: 0.075 } },
  // seat: 소파 방석 윗면에 걸터앉히는 높이(m) / 앞으로 당기는 거리(m)
  dad: { url: '/models/dad.obj', tex: '/models/dad_tex.png', fit: 'height', size: 1.08, face: { eyeY: 0.76, gap: 0.075 }, seat: { y: 0.35, z: 0.22 } },
  dog: { url: '/models/dog.obj', tex: '/models/dog_tex.png', fit: 'height', size: 0.35 },
  sofa: { url: '/models/sofa.glb', fit: 'width', size: 1.8, maxH: 0.95 },
  rug: { url: '/models/rug.glb', fit: 'width', size: 2.5, maxH: 0.04 },
  table: { url: '/models/table.glb', fit: 'width', size: 0.95, maxH: 0.48, anchors: { top: [0, 0, 1.5] } },
  console: { url: '/models/console.glb', fit: 'width', size: 1.9, maxH: 0.65, align: 'back', anchors: { top: [0, 0.22, 2] } },
  tablelamp: { url: '/models/tablelamp.glb', fit: 'height', size: 0.5 },
  chair: { url: '/models/chair.glb', fit: 'height', size: 0.85 },
  stove: { url: '/models/stove.obj', tex: '/models/stove_tex.png', fit: 'width', size: 0.75, maxH: 1.7 },
  kitchencabinet: { url: '/models/kitchencabinet.glb', fit: 'width', size: 2.2, maxH: 2.3, align: 'back', anchors: { counter: [0.4, 0.3, 1.25], sink: [-0.5, 0.3, 1.25] } },
  diningtable: { url: '/models/diningtable.glb', fit: 'height', size: 0.74, maxW: 1.45, anchors: { top: [0.12, 0, 2] } },
  diningchair: { url: '/models/diningchair.glb', fit: 'height', size: 0.88 },
  basket: { url: '/models/basket.glb', fit: 'width', size: 0.42 },
  plant: { url: '/models/plant.glb', fit: 'height', size: 1.35 },
  eucalyptus: { url: '/models/EucalyptusPlant.glb', fit: 'height', size: 1.1 },
}

/* ───────── 로더 ───────── */
const extendGLTF = (loader) => {
  const draco = new DRACOLoader()
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
  loader.setDRACOLoader(draco)
  loader.setMeshoptDecoder(MeshoptDecoder)
}
function useGLB(def) {
  const g = useLoader(GLTFLoader, url(def.url), extendGLTF)
  return { scene: g.scene, animations: g.animations || [] }
}
function useOBJ(def) {
  const obj = useLoader(OBJLoader, url(def.url))
  const tex = useLoader(THREE.TextureLoader, url(def.tex || def.url.replace(/\.obj$/, '_tex.png')))
  const avg = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    tex.flipY = true
    tex.needsUpdate = true
    return averageColor(tex)
  }, [tex])
  return { scene: obj, animations: [], tex, avg }
}

/* 텍스처 평균색 (sRGB → linear) */
function averageColor(tex) {
  try {
    const img = tex.image
    const c = document.createElement('canvas')
    c.width = c.height = 16
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0, 16, 16)
    const d = g.getImageData(0, 0, 16, 16).data
    let r = 0
    let gg = 0
    let b = 0
    let n = 0
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 10) continue
      r += d[i]
      gg += d[i + 1]
      b += d[i + 2]
      n++
    }
    if (!n) return null
    return new THREE.Color().setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace)
  } catch {
    return null
  }
}

/* ───────── 자동 크기 · 바닥 정렬 ───────── */
const _box = new THREE.Box3()
const _size = new THREE.Vector3()
const _ctr = new THREE.Vector3()
const _ray = new THREE.Raycaster()

export function fitModel(src, def) {
  const inner = SkeletonUtils.clone(src.scene)
  inner.rotation.set(def.rotX || 0, def.rotY || 0, 0)
  const wrap = new THREE.Group()
  wrap.add(inner)
  const root = new THREE.Group()
  root.add(wrap)

  // 재질 · 그림자
  inner.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = true
    o.receiveShadow = true
    o.userData.forceShadow = true
    if (src.tex) {
      // OBJ + _tex.png : 기본 색을 순수 흰색으로 두어 텍스처 색이 그대로 나오게 (형광 노랑/주황 버그 수정)
      const g = o.geometry
      const hasUV = !!g.attributes.uv
      const hasVC = !!g.attributes.color
      o.material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: hasUV ? src.tex : null,
        vertexColors: !hasUV && hasVC,
        roughness: 0.9,
        metalness: 0.0,
      })
      // UV 가 없는 OBJ 는 텍스처 한 점만 찍혀 형광색이 되므로 텍스처 평균색으로 칠함
      if (!hasUV && !hasVC && src.avg) o.material.color.copy(src.avg)
    } else {
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      mats.forEach((m) => {
        if (!m) return
        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace
        m.needsUpdate = true
      })
    }
    if (o.isSkinnedMesh) o.frustumCulled = false
  })

  // 1) 원래 크기 측정
  root.updateMatrixWorld(true)
  _box.setFromObject(wrap)
  if (_box.isEmpty()) throw new Error(`빈 모델: ${def.url}`)
  _box.getSize(_size)
  const horiz = Math.max(_size.x, _size.z)
  const dim = def.fit === 'width' ? horiz : def.fit === 'max' ? Math.max(_size.x, _size.y, _size.z) : _size.y
  let s = def.size / Math.max(dim, 1e-6)
  if (def.maxH) s = Math.min(s, def.maxH / Math.max(_size.y, 1e-6))
  if (def.maxW) s = Math.min(s, def.maxW / Math.max(horiz, 1e-6))
  wrap.scale.setScalar(s)

  // 2) 바닥(min.y=0) + 가운데(또는 뒷면) 정렬
  root.updateMatrixWorld(true)
  _box.setFromObject(wrap)
  _box.getCenter(_ctr)
  wrap.position.set(-_ctr.x, -_box.min.y, def.align === 'back' ? -_box.min.z : -_ctr.z)
  root.updateMatrixWorld(true)
  _box.setFromObject(wrap)
  _box.getSize(_size)
  const box = _box.clone()

  // 3) 표면 높이 앵커 (위에서 아래로 레이캐스트)
  const anchors = {}
  for (const [name, [ax, az, from]] of Object.entries(def.anchors || {})) {
    _ray.set(new THREE.Vector3(ax, Math.min(from, box.max.y + 0.01), az), new THREE.Vector3(0, -1, 0))
    const hit = _ray.intersectObject(wrap, true)[0]
    anchors[name] = hit ? hit.point.y : box.max.y
  }

  // 4) 가장 높은 점 (주전자 김 위치 등)
  let top = new THREE.Vector3(0, box.max.y, 0)
  let best = -Infinity
  const v = new THREE.Vector3()
  inner.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return
    const p = o.geometry.attributes.position
    const step = Math.max(1, Math.floor(p.count / 4000))
    for (let i = 0; i < p.count; i += step) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld)
      if (v.y > best) {
        best = v.y
        top = v.clone()
      }
    }
  })

  // 5) 얼굴 찾기 (앞에서 레이캐스트 → 눈 · 볼 위치)
  let face = null
  if (def.face) {
    const h = _size.y
    const gap = def.face.gap * (h / 1.2)
    const shoot = (x, y) => {
      _ray.set(new THREE.Vector3(x, y, box.max.z + 1), new THREE.Vector3(0, 0, -1))
      const hit = _ray.intersectObject(wrap, true)[0]
      if (!hit) return { p: new THREE.Vector3(x, y, box.max.z), n: new THREE.Vector3(0, 0, 1) }
      const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 0, 1)
      if (n.z < 0.2) n.set(0, 0, 1)
      return { p: hit.point.clone(), n: n.normalize() }
    }
    const ey = h * def.face.eyeY
    face = {
      r: h * 0.024,
      eyes: [shoot(-gap, ey), shoot(gap, ey)],
      cheeks: [shoot(-gap * 1.75, ey - h * 0.055), shoot(gap * 1.75, ey - h * 0.055)],
    }
  }

  // 6) 얼굴 패치 (뒷모습 모델 앞면에 살구색 얼굴을 덧댐)
  let patch = null
  if (def.facePatch) {
    const h = _size.y
    const y = h * def.facePatch.y
    _ray.set(new THREE.Vector3(0, y, box.max.z + 1), new THREE.Vector3(0, 0, -1))
    const hit = _ray.intersectObject(wrap, true)[0]
    const p = hit ? hit.point.clone() : new THREE.Vector3(0, y, box.max.z)
    patch = { p, r: h * def.facePatch.r }
  }

  return {
    object: root,
    patch,
    h: _size.y,
    w: _size.x,
    d: _size.z,
    ratio: _size.z / Math.max(_size.y, 1e-6),
    anchors,
    top,
    face,
    animations: src.animations,
    loaded: true,
  }
}

/* ───────── ^ ^ 웃는 눈 + 분홍 볼터치 ───────── */
const Z = new THREE.Vector3(0, 0, 1)
const EYE_M = new THREE.MeshStandardMaterial({ color: '#2a1c16', roughness: 0.4 })
const BLUSH_M = new THREE.MeshStandardMaterial({ color: '#f3a3a6', roughness: 1, transparent: true, opacity: 0.55, depthWrite: false })
export function SmileFace({ face }) {
  if (!face) return null
  const q = (n) => new THREE.Quaternion().setFromUnitVectors(Z, n)
  return (
    <group>
      {face.eyes.map(({ p, n }, i) => (
        <mesh key={'e' + i} position={p.clone().addScaledVector(n, face.r * 0.25)} quaternion={q(n)} material={EYE_M}>
          {/* 위로 볼록한 초승달 = ^ */}
          <torusGeometry args={[face.r, face.r * 0.24, 8, 18, Math.PI]} />
        </mesh>
      ))}
      {face.cheeks.map(({ p, n }, i) => (
        <mesh key={'c' + i} position={p.clone().addScaledVector(n, face.r * 0.15)} quaternion={q(n)} scale={[1.25, 0.72, 0.25]} material={BLUSH_M}>
          <sphereGeometry args={[face.r * 1.15, 16, 10]} />
        </mesh>
      ))}
    </group>
  )
}

/* ───────── 꼬마 얼굴 패치: 살구색 둥근 얼굴 + ^ ^ 눈 + 볼터치 ───────── */
const SKIN_M = new THREE.MeshStandardMaterial({ color: '#f3cfb3', roughness: 0.55 })
export function FacePatch({ patch }) {
  if (!patch) return null
  const { p, r } = patch
  const eyeR = r * 0.17
  return (
    <group position={[p.x, p.y, p.z - r * 0.18]}>
      {/* 앞으로 볼록한 납작 반구 */}
      <mesh scale={[1.05, 0.95, 0.6]} material={SKIN_M}>
        <sphereGeometry args={[r, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * r * 0.38, r * 0.12, r * 0.565]} material={EYE_M}>
            <torusGeometry args={[eyeR, eyeR * 0.26, 8, 18, Math.PI]} />
          </mesh>
          <mesh position={[s * r * 0.62, -r * 0.2, r * 0.46]} rotation-y={s * 0.5} scale={[1.3, 0.75, 0.3]} material={BLUSH_M}>
            <sphereGeometry args={[r * 0.16, 16, 10]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -r * 0.18, r * 0.59]} rotation-z={Math.PI} material={EYE_M}>
        <torusGeometry args={[r * 0.08, r * 0.018, 6, 12, Math.PI]} />
      </mesh>
    </group>
  )
}

/* ───────── 에러 바운더리 (파일 없음/깨짐 → 대체 도형) ───────── */
class ModelBoundary extends Component {
  constructor(p) {
    super(p)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err) {
    console.warn(`[models] ${this.props.name} 불러오기 실패 → 기본 도형으로 대체`, err?.message || err)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

const renderKids = (children, fit) => (typeof children === 'function' ? children(fit) : children)

function Loaded({ def, children, onFit, place, noPrimitive }) {
  const src = def.url.endsWith('.obj') ? useOBJ(def) : useGLB(def) // eslint-disable-line react-hooks/rules-of-hooks
  const fit = useMemo(() => fitModel(src, def), [src, def])
  useEffect(() => {
    onFit?.(fit)
  }, [fit, onFit])
  return (
    <group {...(place ? place(fit) : {})}>
      {!noPrimitive && <primitive object={fit.object} />}
      {!noPrimitive && <SmileFace face={fit.face} />}
      {renderKids(children, fit)}
    </group>
  )
}

/* 사용법:
   <SafeModel name="console" fallback={<옛날도형/>} defaults={{ h: 0.5, anchors: { top: 0.5 } }}
              place={(fit) => ({ position: [...] })}   // 불러온 크기에 따라 위치 조정 (선택)>
     {(fit) => <TV y={fit.anchors.top} />}
   </SafeModel>                                                       */
/* 집 공간은 S 배로 줄였지만 가구·캐릭터는 실제 크기 → 최상위 SafeModel 에서 1/S 로 되돌림 */
export const RealCtx = createContext(false)
export function Real({ children, ...group }) {
  const real = useContext(RealCtx)
  return (
    <group {...group} scale={real ? 1 : 1 / S}>
      <RealCtx.Provider value={true}>{children}</RealCtx.Provider>
    </group>
  )
}

export function SafeModel({ name, def, fallback = null, defaults = {}, children, onFit, place, noPrimitive, ...group }) {
  const d = def || MODELS[name]
  const real = useContext(RealCtx)
  const fb = (
    <>
      {fallback}
      {renderKids(children, { h: 1, anchors: {}, top: new THREE.Vector3(0, defaults.h ?? 1, 0), ...defaults, loaded: false })}
    </>
  )
  return (
    <group {...group} scale={real ? 1 : 1 / S}>
      <RealCtx.Provider value={true}>
      <ModelBoundary name={name} fallback={fb}>
        <Suspense fallback={null}>
          <Loaded def={d} onFit={onFit} place={place} noPrimitive={noPrimitive}>
            {children}
          </Loaded>
        </Suspense>
      </ModelBoundary>
      </RealCtx.Provider>
    </group>
  )
}

/* 애니메이션 클립이 있는 GLB(주인공)용: 걷기/대기 클립 자동 재생 */
export function useClips(fit, speedRef) {
  const mixer = useMemo(() => (fit?.animations?.length ? new THREE.AnimationMixer(fit.object) : null), [fit])
  const acts = useRef({})
  useEffect(() => {
    if (!mixer) return
    const clips = fit.animations
    const find = (re) => clips.find((c) => re.test(c.name))
    const walk = find(/walk|run|move/i)
    const idle = find(/idle|stand|breath/i) || (walk ? null : clips[0])
    if (walk) acts.current.walk = mixer.clipAction(walk).play()
    if (idle) acts.current.idle = mixer.clipAction(idle).play()
    return () => mixer.stopAllAction()
  }, [mixer, fit])
  useFrame((_, dt) => {
    if (!mixer) return
    const s = speedRef()
    if (acts.current.walk) acts.current.walk.setEffectiveWeight(s)
    if (acts.current.idle) acts.current.idle.setEffectiveWeight(acts.current.walk ? 1 - s : 1)
    mixer.update(dt)
  })
  return !!mixer
}
