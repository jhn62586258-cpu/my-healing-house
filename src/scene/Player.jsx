import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { world, getState, useStore, groundY, inside as isInside, inRoom, nearDesk, showToast, standUp, BOUNDS } from '../store'
import * as audio from '../audio/AsmrEngine'
import { KidAvatar, FPLegs } from './Character'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const angDiff = (a, b) => {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}
const R = 0.22
const STOVE = [0.55, -5.35] // 주전자
const POT = [4.25, -5.65] // 뚝배기

/* 드래그(마우스·한 손가락)로 시선(1인칭) / 카메라 회전(3인칭) */
export function LookControls() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    let id = null
    let lx = 0
    let ly = 0
    const pd = (e) => {
      if (id !== null) return
      id = e.pointerId
      lx = e.clientX
      ly = e.clientY
    }
    const pm = (e) => {
      if (e.pointerId !== id) return
      const dx = e.clientX - lx
      const dy = e.clientY - ly
      lx = e.clientX
      ly = e.clientY
      const look = world.look
      const k = e.pointerType === 'touch' ? 1.3 : 1
      if (getState().view === 'first') {
        look.yaw -= dx * 0.005 * k
        look.pitch = clamp(look.pitch - dy * 0.004 * k, -1.2, 0.8)
      } else {
        look.tyaw -= dx * 0.006 * k
        world.cam.tilt = clamp((world.cam.tilt || 0) + dy * 0.004 * k, -0.6, 0.8)
      }
    }
    const pu = (e) => {
      if (e.pointerId === id) id = null
    }
    el.addEventListener('pointerdown', pd)
    window.addEventListener('pointermove', pm)
    window.addEventListener('pointerup', pu)
    window.addEventListener('pointercancel', pu)
    return () => {
      el.removeEventListener('pointerdown', pd)
      window.removeEventListener('pointermove', pm)
      window.removeEventListener('pointerup', pu)
      window.removeEventListener('pointercancel', pu)
    }
  }, [gl])
  return null
}

/* 탭한 위치 표시 */
function TapMarker() {
  const m = useRef()
  useFrame(({ clock }) => {
    const p = world.player
    const last = p.path[p.path.length - 1]
    m.current.visible = !!last
    if (last) {
      m.current.position.set(last.x, groundY(last.x, last.z) + 0.02, last.z)
      const s = 1 + Math.sin(clock.elapsedTime * 6) * 0.12
      m.current.scale.set(s, s, s)
    }
  })
  return (
    <mesh ref={m} rotation-x={-Math.PI / 2} raycast={() => null}>
      <ringGeometry args={[0.13, 0.19, 24]} />
      <meshBasicMaterial color="#fff3c4" transparent opacity={0.85} depthWrite={false} />
    </mesh>
  )
}

export default function Player() {
  const view = useStore((s) => s.view)
  const outfit = useStore((s) => s.outfit)
  const root = useRef()
  const snap = useRef(true)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const mixT = useRef(0)
  const last = useRef({ x: 0, z: 0, t: 0 })

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const p = world.player
    const lk = world.look
    const first = getState().view === 'first'
    const k = world.keys

    // 키보드 + 가상 조이스틱
    const f = clamp((k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - world.joy.y, -1, 1)
    const r = clamp((k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) + world.joy.x, -1, 1)
    if ((f || r) && getState().sitting) standUp()
    const q = (k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0)
    if (q) {
      if (first) lk.yaw -= q * dt * 1.8
      else lk.tyaw -= q * dt * 1.8
    }

    const yaw = first ? lk.yaw : lk.tyaw
    const fx = Math.sin(yaw)
    const fz = Math.cos(yaw)
    let dx = fx * f + -fz * r
    let dz = fz * f + fx * r
    if (dx !== 0 || dz !== 0) {
      p.path = []
      world.pending = null
    } else if (p.path.length) {
      const w = p.path[0]
      const tx = w.x - p.x
      const tz = w.z - p.z
      const d = Math.hypot(tx, tz)
      const isLast = p.path.length === 1
      if (d < (isLast ? 0.1 : 0.28)) p.path.shift()
      else if (w.door && world.doors[w.door].open < 0.7) {
        dx = dz = 0 // 문이 열릴 때까지 잠깐 기다림
        world.doors[w.door].manual = performance.now() + 1500
      } else {
        dx = tx / d
        dz = tz / d
      }
    }
    const len = Math.hypot(dx, dz)
    const mag = Math.min(1, len)
    if (len > 0) {
      dx /= len
      dz /= len
    }
    p.speed += ((len > 0.05 ? mag : 0) - p.speed) * Math.min(1, dt * 10)
    const sp = 2.0 * p.speed
    p.x += dx * sp * dt
    p.z += dz * sp * dt

    // 충돌 (원 vs 박스) — 열린 문은 통과
    for (const c of world.colliders) {
      if (c[4] && world.doors[c[4]].open > 0.7) continue
      const cx = clamp(p.x, c[0], c[1])
      const cz = clamp(p.z, c[2], c[3])
      const ox = p.x - cx
      const oz = p.z - cz
      const d2 = ox * ox + oz * oz
      if (d2 < R * R) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2)
          const kk = (R - d) / d
          p.x += ox * kk
          p.z += oz * kk
        } else {
          const l = p.x - c[0]
          const r2 = c[1] - p.x
          const t = p.z - c[2]
          const b = c[3] - p.z
          const m = Math.min(l, r2, t, b)
          if (m === l) p.x = c[0] - R
          else if (m === r2) p.x = c[1] + R
          else if (m === t) p.z = c[2] - R
          else p.z = c[3] + R
        }
      }
    }
    p.x = clamp(p.x, BOUNDS.x0, BOUNDS.x1)
    p.z = clamp(p.z, BOUNDS.z0, BOUNDS.z1)

    // 막혀서 못 가면 경로 포기
    const now = state.clock.elapsedTime
    if (now - last.current.t > 0.8) {
      const moved = Math.hypot(p.x - last.current.x, p.z - last.current.z)
      const waitingDoor = p.path[0]?.door && world.doors[p.path[0].door].open < 0.7
      if (p.path.length && moved < 0.05 && !waitingDoor) {
        p.stuck++
        if (p.stuck >= 2) p.path = []
      } else p.stuck = 0
      last.current = { x: p.x, z: p.z, t: now }
    }

    // 다가가서 터치한 사물 반응
    const pend = world.pending
    if (pend) {
      const d = Math.hypot(p.x - pend.pos[0], p.z - pend.pos[2])
      if (d <= pend.reach || (!p.path.length && d <= pend.reach + 1.4)) {
        world.pending = null
        p.path = []
        p.rot = Math.atan2(pend.pos[0] - p.x, pend.pos[2] - p.z)
        pend.act()
      } else if (!p.path.length) {
        world.pending = null
        showToast('조금 더 가까이 가서 터치해 볼까요?')
      }
    }

    // 바라보는 방향
    if (first) p.rot = lk.yaw
    else if (len > 0) p.rot += angDiff(p.rot, Math.atan2(dx, dz)) * Math.min(1, dt * 10)

    p.y += (groundY(p.x, p.z) - p.y) * Math.min(1, dt * 12)
    if (world.snap) {
      p.y = groundY(p.x, p.z)
      snap.current = true
      world.snap = false
    }

    if (root.current) {
      root.current.position.set(p.x, p.y, p.z)
      root.current.rotation.y = p.rot
    }

    // 위치에 따른 소리 거리감 (0.25초마다)
    mixT.current -= dt
    if (mixT.current < 0) {
      mixT.current = 0.25
      const near = (pt) => clamp(1.25 - Math.hypot(p.x - pt[0], p.z - pt[1]) / 7, 0.12, 1)
      audio.setMix({ rain: isInside(p.x, p.z) ? 0.4 : 0.75, birds: isInside(p.x, p.z) ? 0.35 : 0.85, stew: near(POT), kettle: near(STOVE) })
    }

    // 카메라
    const cam = state.camera
    if (first) {
      if (cam.fov !== 75) {
        cam.fov = 75
        cam.updateProjectionMatrix()
      }
      cam.rotation.order = 'YXZ'
      cam.position.set(p.x + Math.sin(lk.yaw) * 0.08, p.y + 0.95, p.z + Math.cos(lk.yaw) * 0.08)
      cam.rotation.set(lk.pitch, lk.yaw + Math.PI, 0)
      snap.current = true
    } else {
      const portrait = state.size.height > state.size.width
      const fov = portrait ? 62 : 52
      if (cam.fov !== fov) {
        cam.fov = fov
        cam.updateProjectionMatrix()
      }
      const cd = world.cam
      const inside = isInside(p.x, p.z)
      const desk = nearDesk(p.x, p.z)
      // 실내: 천장 들보(y≈3.0)보다 낮은 눈높이 → 서까래가 시야를 가리지 않음
      const tD = desk ? 2.2 : inRoom(p.x, p.z) ? 2.7 : inside ? 3.1 : 4.0
      const tH = desk ? 1.35 : inside ? 1.7 : 2.4
      const maxH = inside ? 2.2 : 4.2
      cd.dist += (tD * (portrait ? 1.12 : 1) - cd.dist) * Math.min(1, dt * 3)
      cd.h += (clamp(tH + (cd.tilt || 0) * 2, 0.9, maxH) - cd.h) * Math.min(1, dt * 4)
      const fx2 = Math.sin(lk.tyaw)
      const fz2 = Math.cos(lk.tyaw)
      tmp.set(p.x - fx2 * cd.dist, Math.max(0.6, p.y + cd.h), p.z - fz2 * cd.dist)
      // 카메라가 정원 상자 밖으로 나가지 않게 (대신 조금 높이 올려서 내려다보기)
      let tk = 1
      const ddx = tmp.x - p.x
      const ddz = tmp.z - p.z
      if (tmp.z > 8.4) tk = Math.min(tk, (8.4 - p.z) / ddz)
      if (tmp.z < -10.2) tk = Math.min(tk, (-10.2 - p.z) / ddz)
      if (tmp.x > 9.3) tk = Math.min(tk, (9.3 - p.x) / ddx)
      if (tmp.x < -12.3) tk = Math.min(tk, (-12.3 - p.x) / ddx)
      tk = clamp(tk, 0.55, 1)
      if (tk < 1) tmp.set(p.x + ddx * tk, tmp.y + (1 - tk) * 0.8, p.z + ddz * tk)
      if (snap.current) {
        cam.position.copy(tmp)
        snap.current = false
      } else cam.position.lerp(tmp, 1 - Math.exp(-dt * 6))
      look.set(p.x, p.y + (inside ? 0.85 : 0.7) + (portrait ? 0.15 : 0), p.z)
      cam.lookAt(look)
    }
  })

  return (
    <>
      <group ref={root}>{view === 'third' ? <KidAvatar outfit={outfit} /> : <FPLegs outfit={outfit} />}</group>
      <TapMarker />
    </>
  )
}

