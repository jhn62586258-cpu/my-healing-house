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
  // 순정 kid.glb 그대로 (얼굴 패치 없음 — 머리카락과 겹쳐 지글거리는 현상 제거)
  kid: { url: '/models/kid.glb', fit: 'height', size: 0.9 },
  /* OBJ(Rodin AI) 는 UV 가 없어 텍스처를 못 씀 → 높이(Y) 비율로 차분한 무광 색칠
     bands: [아래부터 이 높이 비율까지, 색, (옆·뒷면 색)]  skin: 얼굴 앞면은 살구색 */
  mom: {
    url: '/models/mom.obj',
    fit: 'height',
    size: 1.3,
    face: { eyeY: 0.73, gap: 0.075 },
    paint: { bands: [[0.3, '#3d404d'], [0.65, '#d8cfc2', '#6f7348'], [1, '#3b2a22']], skin: [0.66, 0.9] },
  },
  // seat: 소파 위 높이(m) / 앞뒤 위치(m) — 방석에 엉덩이가 닿고 등받이에 기대도록
  dad: {
    url: '/models/dad.obj',
    fit: 'height',
    size: 1.08,
    face: { eyeY: 0.76, gap: 0.075 },
    seat: { y: 0.13, z: 0.1 },
    paint: { bands: [[0.35, '#3a3d42'], [0.72, '#9e9589'], [1, '#2f241f']], skin: [0.73, 0.92] },
  },
  dog: { url: '/models/dog.obj', fit: 'height', size: 0.35, paint: { bands: [[1, '#9c6b43']], nose: '#222222' } },
  sofa: { url: '/models/sofa.glb', fit: 'width', size: 1.8, maxH: 0.95 },
  rug: { url: '/models/rug.glb', fit: 'width', size: 2.5, maxH: 0.04 },
  table: { url: '/models/table.glb', fit: 'width', size: 0.95, maxH: 0.48, anchors: { top: [0, 0, 1.5] } },
  console: { url: '/models/console.glb', fit: 'width', size: 1.9, maxH: 0.65, align: 'back', anchors: { top: [0, 0.22, 2] } },
  tablelamp: { url: '/models/tablelamp.glb', fit: 'height', size: 0.5 },
  chair: { url: '/models/chair.glb', fit: 'height', size: 0.85 },
  stove: {
    url: '/models/stove.obj',
    fit: 'width',
    size: 0.75,
    maxH: 1.7,
    // 아래 70% 무쇠 난로 + 앞 창문 불빛 / 위 30% 양은 주전자(은은한 금속)
    paint: { bands: [[0.7, '#2a2c30'], [1, '#c8a856', null, { metal: true }]], metal: { metalness: 0.3, roughness: 0.5 }, glow: [0.18, 0.5] },
  },
  kitchencabinet: { url: '/models/kitchencabinet.glb', fit: 'width', size: 2.2, maxH: 2.3, align: 'back', anchors: { counter: [0.4, 0.3, 1.25], sink: [-0.5, 0.3, 1.25] } },
  diningtable: { url: '/models/diningtable.glb', fit: 'height', size: 0.74, maxW: 1.45, anchors: { top: [0.12, 0, 2] } },
  diningchair: { url: '/models/diningchair.glb', fit: 'height', size: 0.88 },
  basket: { url: '/models/basket.glb', fit: 'width', size: 0.42 },
  plant: { url: '/models/plant.glb', fit: 'height', size: 0.68 },
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
  return { scene: obj, animations: [], isOBJ: true }
}
/* 세트 OBJ: 짝꿍 텍스처(_tex.png)까지 함께 */
function useOBJTex(def) {
  const obj = useLoader(OBJLoader, url(def.url))
  const tex = useLoader(THREE.TextureLoader, url(def.tex))
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    tex.needsUpdate = true
  }, [tex])
  return { scene: obj, animations: [], isOBJ: true, tex }
}

/* 공통 재질 규칙: 텍스처는 sRGB, 텍스처가 있으면 기본색은 순수 흰색, 무광(0.9/0.0) → 형광색 없이 원래 색감 */
function calmMaterial(m) {
  if (!m) return m
  let out = m
  if (!m.isMeshStandardMaterial) {
    out = new THREE.MeshStandardMaterial({ map: m.map || null, color: m.color ? m.color.clone() : 0xffffff, transparent: m.transparent, opacity: m.opacity ?? 1, alphaTest: m.alphaTest || 0, side: m.side, vertexColors: !!m.vertexColors })
  }
  if (out.map) {
    out.map.colorSpace = THREE.SRGBColorSpace
    out.color.set(0xffffff)
  }
  if (out.emissiveMap) out.emissiveMap.colorSpace = THREE.SRGBColorSpace
  out.roughness = 0.9
  out.metalness = 0.0
  // 정점 색(COLOR_0)으로 칠해진 모델은 그대로 유지
  out.needsUpdate = true
  return out
}
/* UV 없는 OBJ 용: 텍스처 평균색을 채도·밝기를 눌러 차분하게 */
function mutedAverage(tex) {
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 16
    const g = c.getContext('2d')
    g.drawImage(tex.image, 0, 0, 16, 16)
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
    const col = new THREE.Color().setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace)
    const hsl = {}
    col.getHSL(hsl)
    return col.setHSL(hsl.h, Math.min(hsl.s, 0.3), Math.min(hsl.l, 0.55))
  } catch {
    return new THREE.Color('#9a8a78')
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
    if (src.isOBJ && src.tex && o.geometry.attributes.uv) {
      // 세트 OBJ + _tex.png (UV 있음): 텍스처 그대로, 흰 기본색 · 무광
      o.material = calmMaterial(new THREE.MeshStandardMaterial({ map: src.tex }))
    } else if (src.isOBJ) {
      // UV 없는 OBJ: 정점 색으로 칠함 (paint 설정이 있으면 높이 비율 색칠, 없으면 차분한 평균색)
      o.geometry = o.geometry.clone()
      o.geometry.deleteAttribute('color')
      o.geometry.deleteAttribute('uv')
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals()
    } else {
      o.material = Array.isArray(o.material) ? o.material.map(calmMaterial) : calmMaterial(o.material)
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

  // 2.5) OBJ: 높이(Y) 비율 기반 무광 색칠
  let dots = []
  if (src.isOBJ && !(src.tex && hasUV(inner))) {
    if (def.paint) dots = paintByHeight(inner, box, def.paint)
    else {
      const c = src.tex ? mutedAverage(src.tex) : new THREE.Color('#9a8a78')
      inner.traverse((o) => o.isMesh && (o.material = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0 })))
    }
  }

  // 2.7) 세트 안 상호작용 지점: [가로 비율, 깊이 비율, (레이 시작 높이 m)] → 위에서 아래로 쏴서 표면 높이
  const points = {}
  for (const [name, [fx, fz, from]] of Object.entries(def.points || {})) {
    const cx = (box.min.x + box.max.x) / 2
    const cz = (box.min.z + box.max.z) / 2
    const x = cx + fx * (box.max.x - box.min.x) * 0.5
    const z = cz + fz * (box.max.z - box.min.z) * 0.5
    _ray.set(new THREE.Vector3(x, from ?? box.max.y + 0.01, z), new THREE.Vector3(0, -1, 0))
    const hit = _ray.intersectObject(wrap, true)[0]
    points[name] = new THREE.Vector3(x, hit ? hit.point.y : 0, z)
  }

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
    patch = { p, r: h * def.facePatch.r, inset: def.facePatch.inset ?? 0, color: def.facePatch.color || '#ebc09e' }
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
    dots,
    points,
    animations: src.animations,
    loaded: true,
  }
}

function hasUV(obj) {
  let ok = false
  obj.traverse((o) => o.isMesh && o.geometry.attributes.uv && (ok = true))
  return ok
}

/* ───────── 높이 비율 기반 정점 색칠 (UV 없는 OBJ 용) ─────────
   · bands: [[높이비율, 앞면색, 옆뒷면색?, {metal}]...]  아래에서부터
   · skin : [시작, 끝] 높이 비율 사이 얼굴 앞면을 살구색으로
   · nose : 가장 앞쪽 끝(코)을 이 색으로 + 까만 눈 점 위치 반환
   · glow : 난로 앞 창문(높이 비율 구간, 앞면 가운데)을 은은한 주황 불빛으로
   · metal: band 의 metal 표시 부분만 metalness/roughness 다르게 (셰이더 주입) */
const _p = new THREE.Vector3()
const _n = new THREE.Vector3()
const _nm = new THREE.Matrix3()
function paintByHeight(inner, box, paint) {
  const H = Math.max(1e-6, box.max.y - box.min.y)
  const W = Math.max(1e-6, box.max.x - box.min.x)
  const bands = paint.bands.map(([to, c, side, opt]) => ({ to, c: new THREE.Color(c), side: side ? new THREE.Color(side) : null, metal: !!opt?.metal }))
  const skin = new THREE.Color('#ebc09e')
  const glowC = new THREE.Color('#e8833a')
  const noseC = paint.nose ? new THREE.Color(paint.nose) : null
  const meshes = []
  inner.traverse((o) => o.isMesh && meshes.push(o))

  // 얼굴(머리) 가로 범위 · 코 끝 찾기
  let headHalf = W * 0.25
  let nose = null
  for (const o of meshes) {
    const pos = o.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      _p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
      const t = (_p.y - box.min.y) / H
      if (paint.skin && t > paint.skin[0] && t < paint.skin[1]) headHalf = Math.max(headHalf, Math.abs(_p.x) * 0.6)
      if (noseC && (!nose || _p.z > nose.z)) nose = _p.clone()
    }
  }

  for (const o of meshes) {
    const g = o.geometry
    const pos = g.attributes.position
    const nor = g.attributes.normal
    _nm.getNormalMatrix(o.matrixWorld)
    const col = new Float32Array(pos.count * 3)
    const band = new Float32Array(pos.count)
    const glow = new Float32Array(pos.count)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      _p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
      _n.fromBufferAttribute(nor, i).applyMatrix3(_nm).normalize()
      const t = (_p.y - box.min.y) / H
      const k = bands.findIndex((b) => t <= b.to + 1e-4)
      const b = bands[k < 0 ? bands.length - 1 : k]
      const front = _n.z > 0.3
      c.copy(b.side && !front ? b.side : b.c)
      // 경계 부드럽게 (아래 띠 색과 3% 구간 섞기)
      const prev = bands[(k < 0 ? bands.length - 1 : k) - 1]
      if (prev && t - prev.to < 0.03) c.lerp(prev.side && !front ? prev.side : prev.c, 0.5 - (t - prev.to) / 0.06)
      if (paint.skin) {
        // 얼굴 앞면은 부드럽게 섞어 칠함 (경계가 계단처럼 깨지지 않게)
        const ss = (a, b, x) => {
          const u = Math.min(1, Math.max(0, (x - a) / (b - a)))
          return u * u * (3 - 2 * u)
        }
        const [s0, s1] = paint.skin
        const wy = ss(s0, s0 + 0.04, t) * (1 - ss(s1 - 0.05, s1, t))
        const wn = ss(0.35, 0.7, _n.z)
        const wx = 1 - ss(headHalf * 0.75, headHalf, Math.abs(_p.x))
        const w = wy * wn * wx
        if (w > 0) c.lerp(skin, w)
      }
      if (noseC && nose && _p.distanceTo(nose) < H * 0.12) c.copy(noseC)
      if (paint.glow && t > paint.glow[0] && t < paint.glow[1] && _n.z > 0.6 && Math.abs(_p.x) < W * 0.22) {
        c.copy(glowC)
        glow[i] = 1
      }
      band[i] = b.metal ? 1 : 0
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.setAttribute('aBand', new THREE.BufferAttribute(band, 1))
    g.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1))
    o.material = paintMaterial(paint)
  }

  // 강아지: 코 위쪽 양옆에 까만 눈 점
  const dots = []
  if (nose) {
    for (const sx of [-1, 1]) {
      _ray.set(new THREE.Vector3(nose.x + sx * H * 0.13, nose.y + H * 0.16, box.max.z + 1), new THREE.Vector3(0, 0, -1))
      const hit = _ray.intersectObject(inner, true)[0]
      dots.push({ p: hit ? hit.point.clone() : new THREE.Vector3(nose.x + sx * H * 0.13, nose.y + H * 0.16, nose.z - H * 0.1), r: H * 0.045 })
    }
  }
  return dots
}

function paintMaterial(paint) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.0 })
  const metal = paint.metal || { metalness: 0.3, roughness: 0.5 }
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMetal2 = { value: metal.metalness }
    sh.uniforms.uRough2 = { value: metal.roughness }
    sh.uniforms.uGlow = { value: paint.glow ? 1.1 : 0 }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aBand;\nattribute float aGlow;\nvarying float vBand;\nvarying float vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBand = aBand;\nvGlow = aGlow;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vBand;\nvarying float vGlow;\nuniform float uMetal2;\nuniform float uRough2;\nuniform float uGlow;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, uRough2, vBand);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, uMetal2, vBand);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.45, 0.14) * vGlow * uGlow;')
  }
  m.customProgramCacheKey = () => 'paint-' + (paint.glow ? 'g' : '') + (paint.metal ? 'm' : '')
  return m
}

const DOT_M = new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.25 })
export function Dots({ dots }) {
  if (!dots?.length) return null
  return dots.map((d, i) => (
    <mesh key={i} position={d.p} material={DOT_M}>
      <sphereGeometry args={[d.r, 12, 10]} />
    </mesh>
  ))
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
const PATCH_M = {}
const patchMat = (c) => (PATCH_M[c] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }))
export function FacePatch({ patch }) {
  if (!patch) return null
  const { p, r, inset, color } = patch
  const eyeR = r * 0.17
  return (
    <group position={[p.x, p.y, p.z - r * 0.18 - inset]}>
      {/* 앞으로 볼록한 납작 반구 */}
      <mesh scale={[1.05, 0.95, 0.6]} material={patchMat(color)}>
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
  const src = def.url.endsWith('.obj') ? (def.tex ? useOBJTex(def) : useOBJ(def)) : useGLB(def) // eslint-disable-line react-hooks/rules-of-hooks
  const fit = useMemo(() => fitModel(src, def), [src, def])
  useEffect(() => {
    onFit?.(fit)
  }, [fit, onFit])
  return (
    <group {...(place ? place(fit) : {})}>
      {!noPrimitive && <primitive object={fit.object} />}
      {!noPrimitive && <SmileFace face={fit.face} />}
      {!noPrimitive && <Dots dots={fit.dots} />}
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

export function SafeModel({ name, def, fallback = null, defaults = {}, children, onFit, place, noPrimitive, childrenOnFail = true, ...group }) {
  const d = def || MODELS[name]
  const real = useContext(RealCtx)
  const fb = (
    <>
      {fallback}
      {childrenOnFail && renderKids(children, { h: 1, anchors: {}, points: {}, top: new THREE.Vector3(0, defaults.h ?? 1, 0), ...defaults, loaded: false })}
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
