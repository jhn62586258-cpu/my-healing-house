import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { world } from '../store'

/* ───────── 차분한 자연광 톤 필터 ───────── */
const _c = new THREE.Color()
const _hsl = {}
const softCache = new Map()
export function soft(c) {
  if (!c || typeof c !== 'string') return c
  if (softCache.has(c)) return softCache.get(c)
  _c.set(c)
  _c.getHSL(_hsl)
  // 자연광 미니어처 톤: 채도만 살짝 눌러 차분하게
  _c.setHSL(_hsl.h, _hsl.s * 0.88, _hsl.l)
  const out = '#' + _c.getHexString()
  softCache.set(c, out)
  return out
}

/* ───────── 둥근 모서리 박스 / 둥근 원기둥 (지오메트리 캐시) ───────── */
const geoCache = new Map()
export function roundBoxGeo(w, h, d, rad) {
  const r = Math.max(0.004, Math.min(rad ?? 0.09, Math.min(w, h, d) * 0.42))
  const key = `rb${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}_${r.toFixed(3)}`
  if (!geoCache.has(key)) geoCache.set(key, new RoundedBoxGeometry(w, h, d, 3, r))
  return geoCache.get(key)
}
export function roundCylGeo(rt, rb, h, seg = 20, rad) {
  const rr = Math.max(0.003, Math.min(rad ?? 0.05, h * 0.3, Math.min(rt, rb) * 0.45))
  const key = `rc${rt.toFixed(3)}_${rb.toFixed(3)}_${h.toFixed(3)}_${seg}_${rr.toFixed(3)}`
  if (!geoCache.has(key)) {
    const pts = [new THREE.Vector2(0, -h / 2)]
    const arc = (cx, cy, a0, a1) => {
      for (let i = 0; i <= 5; i++) {
        const a = a0 + ((a1 - a0) * i) / 5
        pts.push(new THREE.Vector2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr))
      }
    }
    arc(rb - rr, -h / 2 + rr, -Math.PI / 2, 0)
    arc(rt - rr, h / 2 - rr, 0, Math.PI / 2)
    pts.push(new THREE.Vector2(0, h / 2))
    const g = new THREE.LatheGeometry(pts, seg)
    geoCache.set(key, g)
  }
  return geoCache.get(key)
}

/* 자주 쓰는 3D 조각들 (전부 둥근 모서리 + 파스텔) */
export const Box = ({ p = [0, 0, 0], s = [1, 1, 1], c = '#ccc', r = 0.9, m = 0, rot, emissive, ei = 0, opacity, rad, raw, children, ...rest }) => {
  const geo = useMemo(() => roundBoxGeo(s[0], s[1], s[2], rad), [s[0], s[1], s[2], rad])
  return (
    <mesh position={p} rotation={rot} geometry={geo} {...rest}>
      <meshStandardMaterial
        color={raw ? c : soft(c)}
        roughness={r}
        metalness={m * 0.5}
        emissive={emissive || '#000000'}
        emissiveIntensity={ei}
        transparent={opacity !== undefined}
        opacity={opacity ?? 1}
      />
      {children}
    </mesh>
  )
}

export const Cyl = ({ p = [0, 0, 0], r = 0.1, rb, h = 1, c = '#ccc', seg = 20, rot, opacity, rad, raw, ...rest }) => {
  const geo = useMemo(() => roundCylGeo(r, rb ?? r, h, seg, rad), [r, rb, h, seg, rad])
  return (
    <mesh position={p} rotation={rot} geometry={geo} {...rest}>
      <meshStandardMaterial color={raw ? c : soft(c)} roughness={0.85} transparent={opacity !== undefined} opacity={opacity ?? 1} />
    </mesh>
  )
}

export const Sph = ({ p = [0, 0, 0], r = 0.1, c = '#ccc', sc, seg = 18, emissive, ei = 0, opacity, rough = 0.85, raw, ...rest }) => (
  <mesh position={p} scale={sc} {...rest}>
    <sphereGeometry args={[r, seg, Math.max(10, Math.floor(seg * 0.75))]} />
    <meshStandardMaterial
      color={raw ? c : soft(c)}
      roughness={rough}
      emissive={emissive || '#000000'}
      emissiveIntensity={ei}
      transparent={opacity !== undefined}
      opacity={opacity ?? 1}
    />
  </mesh>
)

/* 캡슐 (몸통·다리·팔) — 축은 y */
export const Cap = ({ p = [0, 0, 0], r = 0.1, len = 0.2, c = '#ccc', rot, sc, rough = 0.85, raw, mat, ...rest }) => (
  <mesh position={p} rotation={rot} scale={sc} material={mat} {...rest}>
    <capsuleGeometry args={[r, len, 6, 16]} />
    {!mat && <meshStandardMaterial color={raw ? c : soft(c)} roughness={rough} />}
  </mesh>
)

/* 눈에 안 보이는 클릭 영역 */
export const Hit = ({ p = [0, 0, 0], s = [1, 1, 1], rot, ...rest }) => (
  <mesh position={p} rotation={rot} {...rest}>
    <boxGeometry args={s} />
    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
  </mesh>
)

export const HitCyl = ({ p = [0, 0, 0], r = 0.5, h = 1, ...rest }) => (
  <mesh position={p} {...rest}>
    <cylinderGeometry args={[r, r, h, 12]} />
    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
  </mesh>
)

/* 카메라 시야를 가리면 반투명해지는 벽 / 블록 (축 정렬 박스)
   x0..x1, z0..z1, y0..y1 */

export function FadeBox({ x0, x1, z0, z1, y0 = 0, y1 = 3, c = '#f1e6cc', r = 1, map, tag, onClick = (e) => e.stopPropagation() }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: map ? c : soft(c), roughness: r, ...(map ? { map } : {}) }), [c, r, map])
  const geo = useMemo(() => roundBoxGeo(x1 - x0, y1 - y0, z1 - z0, 0.06), [x0, x1, y0, y1, z0, z1])
  useEffect(() => {
    const entry = { box: [x0, x1, z0, z1, y1], mat, mesh: ref.current, a: 1, tag }
    world.fades.push(entry)
    return () => {
      world.fades = world.fades.filter((f) => f !== entry)
    }
  }, [x0, x1, z0, z1, y1, mat, tag])
  const raycast = useMemo(
    () =>
      function (rc, hits) {
        if (mat.opacity < 0.9) return
        THREE.Mesh.prototype.raycast.call(this, rc, hits)
      },
    [mat]
  )
  return (
    <mesh ref={ref} position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]} material={mat} geometry={geo} raycast={raycast} onClick={onClick} />
  )
}

/* 투명 유리판 (클릭 통과) */
export const Glass = ({ p, s, rot, opacity = 0.16 }) => (
  <mesh position={p} rotation={rot} raycast={() => null}>
    <planeGeometry args={s} />
    <meshStandardMaterial color="#cfe6f2" transparent opacity={opacity} roughness={0.05} metalness={0.2} side={THREE.DoubleSide} depthWrite={false} />
  </mesh>
)

/* 두 점 사이를 잇는 원기둥 (기둥, 서까래, 빨랫줄 등) */
const _up = new THREE.Vector3(0, 1, 0)
export function Rod({ a, b, r = 0.03, c = '#888', rough = 0.7, metal = 0 }) {
  const { pos, quat, len } = useMemo(() => {
    const A = new THREE.Vector3(...a)
    const B = new THREE.Vector3(...b)
    const d = B.clone().sub(A)
    const len = d.length()
    const quat = new THREE.Quaternion().setFromUnitVectors(_up, d.normalize())
    return { pos: A.add(B).multiplyScalar(0.5).toArray(), quat, len }
  }, [a[0], a[1], a[2], b[0], b[1], b[2]])
  return (
    <mesh position={pos} quaternion={quat}>
      <capsuleGeometry args={[r, Math.max(0.001, len - r * 0.6), 4, 10]} />
      <meshStandardMaterial color={soft(c)} roughness={Math.max(0.5, rough)} metalness={metal * 0.5} />
    </mesh>
  )
}

/* 임의의 다각형 면들(삼각형 목록)로 만든 지오메트리 — faces: [[p0,p1,p2,(p3)], ...], uvFn(p, faceIdx) */
export function polyGeo(faces, uvFn) {
  const pos = []
  const uv = []
  faces.forEach((f, fi) => {
    const tris = f.length === 4 ? [f[0], f[1], f[2], f[0], f[2], f[3]] : f
    for (const p of tris) {
      pos.push(...p)
      uv.push(...uvFn(p, fi))
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}
