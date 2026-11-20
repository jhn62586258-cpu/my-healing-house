import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { world, getState, setState, useStore, groundY, zoneAt, inDesk, nearDesk } from '../store'
import { Child, FPLegs } from './Character'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const angDiff = (a, b) => {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}
const R = 0.24

/* 드래그로 시선(1인칭) / 카메라 회전(3인칭) */
export function LookControls() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    let down = false
    let lx = 0
    let ly = 0
    const pd = (e) => {
      down = true
      lx = e.clientX
      ly = e.clientY
    }
    const pm = (e) => {
      if (!down || world.dragLock) return
      const dx = e.clientX - lx
      const dy = e.clientY - ly
      lx = e.clientX
      ly = e.clientY
      const look = world.look
      if (getState().view === 'first') {
        look.yaw -= dx * 0.005
        look.pitch = clamp(look.pitch - dy * 0.004, -1.3, 0.8)
      } else {
        look.tyaw -= dx * 0.006
      }
    }
    const pu = () => {
      down = false
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

export default function Player() {
  const view = useStore((s) => s.view)
  const outfit = useStore((s) => s.outfit)
  const root = useRef()
  const snap = useRef(true)
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const p = world.player
    const look = world.look
    const first = getState().view === 'first'
    const k = world.keys

    const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
    const r = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0)
    const q = (k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0)
    if (q) {
      if (first) look.yaw -= q * dt * 1.8
      else look.tyaw -= q * dt * 1.8
    }

    const yaw = first ? look.yaw : look.tyaw
    const fx = Math.sin(yaw)
    const fz = Math.cos(yaw)
    let dx = fx * f + -fz * r
    let dz = fz * f + fx * r
    if (dx !== 0 || dz !== 0) p.target = null
    else if (p.target) {
      const tx = p.target.x - p.x
      const tz = p.target.z - p.z
      const d = Math.hypot(tx, tz)
      if (d < 0.1) p.target = null
      else {
        dx = tx / d
        dz = tz / d
      }
    }
    const len = Math.hypot(dx, dz)
    if (len > 0) {
      dx /= len
      dz /= len
    }
    p.speed += ((len > 0 ? 1 : 0) - p.speed) * Math.min(1, dt * 10)
    const sp = 1.9 * p.speed
    p.x += dx * sp * dt
    p.z += dz * sp * dt

    // 충돌 (원 vs 박스)
    for (const c of world.colliders) {
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
    p.x = clamp(p.x, -13, 13)
    p.z = clamp(p.z, -5.6, 11.3)

    // 바라보는 방향
    if (first) p.rot = look.yaw
    else if (len > 0) p.rot += angDiff(p.rot, Math.atan2(dx, dz)) * Math.min(1, dt * 10)

    p.y += (groundY(p.x, p.z) - p.y) * Math.min(1, dt * 12)

    const z = zoneAt(p.x, p.z)
    if (z !== getState().zone) setState({ zone: z })

    // 지붕 / 책상 반투명 연출
    const fxs = world.fx
    fxs.desk += ((inDesk(p.x, p.z) ? 0.18 : 1) - fxs.desk) * Math.min(1, dt * 5)
    fxs.roof += ((first ? 1 : 0.1) - fxs.roof) * Math.min(1, dt * 4)

    if (root.current) {
      root.current.position.set(p.x, p.y, p.z)
      root.current.rotation.y = p.rot
    }

    // 카메라
    const cam = state.camera
    if (first) {
      if (cam.fov !== 78) {
        cam.fov = 78
        cam.updateProjectionMatrix()
      }
      cam.rotation.order = 'YXZ'
      cam.position.set(p.x + Math.sin(look.yaw) * 0.05, p.y + 0.95, p.z + Math.cos(look.yaw) * 0.05)
      cam.rotation.set(look.pitch, look.yaw + Math.PI, 0)
      snap.current = true
    } else {
      if (cam.fov !== 50) {
        cam.fov = 50
        cam.updateProjectionMatrix()
      }
      const cd = world.cam
      const near = nearDesk(p.x, p.z)
      cd.dist += ((near ? 2.7 : 5.0) - cd.dist) * Math.min(1, dt * 3)
      cd.h += ((near ? 2.3 : 4.0) - cd.h) * Math.min(1, dt * 3)
      const fx2 = Math.sin(look.tyaw)
      const fz2 = Math.cos(look.tyaw)
      tmp.set(p.x - fx2 * cd.dist, Math.max(0.6, p.y + cd.h), p.z - fz2 * cd.dist)
      if (snap.current) {
        cam.position.copy(tmp)
        snap.current = false
      } else cam.position.lerp(tmp, 1 - Math.exp(-dt * 6))
      cam.lookAt(p.x, p.y + 0.55, p.z)
    }
  })

  return <group ref={root}>{view === 'third' ? <Child outfit={outfit} /> : <FPLegs outfit={outfit} />}</group>
}
