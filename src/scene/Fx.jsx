import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { softDot, emojiTex } from './textures'
import { world as storeWorld } from '../store'

const W = 1024
const H = 200

function roundRect(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

/* 머리 위 말풍선 (3D 스프라이트) — ref.current.say('텍스트') */
export const SpeechBubble = forwardRef(function SpeechBubble({ y = 2, scale = 1 }, ref) {
  const spr = useRef()
  const st = useRef({ until: 0, a: 0, pop: 0 })
  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return { canvas, tex }
  }, [])

  useImperativeHandle(ref, () => ({
    say(text, ms = 4000) {
      const g = canvas.getContext('2d')
      g.clearRect(0, 0, W, H)
      g.font = 'bold 60px "Pretendard","Noto Sans KR","Apple SD Gothic Neo",sans-serif'
      const tw = Math.min(W - 60, g.measureText(text).width + 80)
      const x = (W - tw) / 2
      g.shadowColor = 'rgba(60,35,10,.25)'
      g.shadowBlur = 12
      g.fillStyle = '#fffaf0'
      roundRect(g, x, 14, tw, 130, 60)
      g.fill()
      g.beginPath()
      g.moveTo(W / 2 - 22, 140)
      g.lineTo(W / 2, 182)
      g.lineTo(W / 2 + 22, 140)
      g.fill()
      g.shadowBlur = 0
      g.strokeStyle = '#e6c79a'
      g.lineWidth = 5
      roundRect(g, x, 14, tw, 130, 60)
      g.stroke()
      g.fillStyle = '#4a3220'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(text, W / 2, 82, W - 100)
      tex.needsUpdate = true
      st.current.until = performance.now() + ms
      st.current.pop = 1
    },
  }))

  useFrame(({ clock }, dt) => {
    const s = st.current
    const on = performance.now() < s.until
    s.a += ((on ? 1 : 0) - s.a) * Math.min(1, dt * 8)
    s.pop = Math.max(0, s.pop - dt * 4)
    const m = spr.current
    m.visible = s.a > 0.02
    m.material.opacity = s.a
    const k = scale * (1 + s.pop * 0.15)
    m.scale.set(3.3 * k, 3.3 * k * (H / W), 1)
    m.position.y = y + Math.sin(clock.elapsedTime * 2) * 0.03
  })

  return (
    <sprite ref={spr} position={[0, y, 0]} raycast={() => null} renderOrder={999} visible={false}>
      <spriteMaterial map={tex} transparent depthTest={false} depthWrite={false} opacity={0} />
    </sprite>
  )
})

/* 둥실 떠오르는 하트 — ref.current.burst() */
export const Hearts = forwardRef(function Hearts({ y = 0.8, ch = '❤️' }, ref) {
  const items = useRef([])
  const t0 = useRef(-10)
  const tex = useMemo(() => emojiTex(ch), [ch])
  useImperativeHandle(ref, () => ({ burst: () => (t0.current = performance.now() / 1000) }))
  useFrame(() => {
    const t = performance.now() / 1000 - t0.current
    items.current.forEach((m, i) => {
      if (!m) return
      const k = t - i * 0.18
      const vis = k > 0 && k < 1.6
      m.visible = vis
      if (!vis) return
      m.position.set(Math.sin(k * 4 + i) * 0.12 + (i - 1) * 0.12, y + k * 0.55, 0)
      m.material.opacity = Math.min(1, (1.6 - k) * 1.5)
      const s = 0.22 + Math.min(k, 0.2)
      m.scale.set(s, s, 1)
    })
  })
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <sprite key={i} ref={(el) => (items.current[i] = el)} visible={false} raycast={() => null} renderOrder={998}>
          <spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} />
        </sprite>
      ))}
    </group>
  )
})

/* 모락모락 김 */
export function Steam({ on, p = [0, 0, 0], n = 7, spread = 0.08, rise = 0.9, size = 0.22 }) {
  const items = useRef([])
  const a = useRef(0)
  const seeds = useMemo(() => Array.from({ length: n }, () => Math.random()), [n])
  const tex = useMemo(() => softDot(), [])
  useFrame(({ clock }, dt) => {
    a.current += ((on ? 1 : 0) - a.current) * Math.min(1, dt * 2)
    const t = clock.elapsedTime
    items.current.forEach((m, i) => {
      if (!m) return
      const k = (t * 0.45 + seeds[i]) % 1
      m.visible = a.current > 0.02
      m.position.set(Math.sin(t * 1.3 + i * 2) * spread * (0.4 + k), k * rise, Math.cos(t + i) * spread * 0.5)
      const s = size * (0.5 + k)
      m.scale.set(s, s, 1)
      m.material.opacity = a.current * 0.55 * Math.sin(k * Math.PI)
    })
  })
  return (
    <group position={p}>
      {seeds.map((_, i) => (
        <sprite key={i} ref={(el) => (items.current[i] = el)} raycast={() => null}>
          <spriteMaterial map={tex} transparent depthWrite={false} color="#ffffff" />
        </sprite>
      ))}
    </group>
  )
}

/* 반짝이 표시 (터치 가능한 사물 위) */
export function Sparkle({ p = [0, 0, 0] }) {
  const m = useRef()
  const tex = useMemo(() => softDot(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const k = 0.5 + 0.5 * Math.sin(t * 3 + p[0] * 3)
    m.current.scale.setScalar(0.1 + k * 0.08)
    m.current.material.opacity = 0.35 + k * 0.5
    m.current.position.y = p[1] + Math.sin(t * 1.5 + p[2]) * 0.05
  })
  return (
    <sprite ref={m} position={p} raycast={() => null}>
      <spriteMaterial map={tex} color="#fff2b0" transparent depthWrite={false} />
    </sprite>
  )
}

/* ───────── 소리 표시 아이콘 (🔊/♪) ─────────
   사물 머리 위에 은은하게 둥둥. 재생 중이면 반짝 + 파동 링이 퍼짐 */
let badgeTex = null
let ringTex = null
function makeBadgeTex() {
  if (badgeTex) return badgeTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = 'rgba(28,24,20,0.55)'
  g.beginPath()
  g.arc(64, 64, 56, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.55)'
  g.lineWidth = 4
  g.stroke()
  // 스피커
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.moveTo(36, 54)
  g.lineTo(50, 54)
  g.lineTo(66, 40)
  g.lineTo(66, 88)
  g.lineTo(50, 74)
  g.lineTo(36, 74)
  g.closePath()
  g.fill()
  g.strokeStyle = '#ffffff'
  g.lineWidth = 5
  g.lineCap = 'round'
  for (const r of [12, 22]) {
    g.beginPath()
    g.arc(68, 64, r, -0.7, 0.7)
    g.stroke()
  }
  badgeTex = new THREE.CanvasTexture(c)
  badgeTex.colorSpace = THREE.SRGBColorSpace
  return badgeTex
}
function makeRingTex() {
  if (ringTex) return ringTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.strokeStyle = 'rgba(255,240,210,1)'
  g.lineWidth = 6
  g.beginPath()
  g.arc(64, 64, 56, 0, Math.PI * 2)
  g.stroke()
  ringTex = new THREE.CanvasTexture(c)
  return ringTex
}

export function SoundBadge({ id, p = [0, 0, 0], size = 0.3 }) {
  const { world } = SoundBadge.deps
  const g = useRef()
  const icon = useRef()
  const rings = useRef([])
  const tex = useMemo(() => makeBadgeTex(), [])
  const rtex = useMemo(() => makeRingTex(), [])
  const seed = useMemo(() => Math.random() * 10, [])
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime
    const playing = (world.playing[id] || 0) > performance.now()
    // 너무 멀면 숨김 (화면이 지저분하지 않게)
    const d = camera.position.distanceTo(g.current.getWorldPosition(_v))
    const far = d > 9
    g.current.visible = !far
    g.current.position.y = p[1] + Math.sin(t * 1.6 + seed) * 0.04
    const pulse = playing ? 1 + Math.sin(t * 9) * 0.08 : 1
    icon.current.scale.set(size * pulse, size * pulse, 1)
    icon.current.material.opacity = playing ? 0.95 : 0.6
    rings.current.forEach((r, i) => {
      if (!r) return
      const k = (t * 0.9 + i * 0.5) % 1
      r.visible = playing
      const s = size * (1 + k * 1.6)
      r.scale.set(s, s, 1)
      r.material.opacity = (1 - k) * 0.7
    })
  })
  return (
    <group ref={g} position={p}>
      <sprite ref={icon} raycast={() => null} renderOrder={990}>
        <spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} opacity={0.6} />
      </sprite>
      {[0, 1].map((i) => (
        <sprite key={i} ref={(el) => (rings.current[i] = el)} raycast={() => null} renderOrder={989} visible={false}>
          <spriteMaterial map={rtex} transparent depthWrite={false} depthTest={false} color="#ffe6b8" />
        </sprite>
      ))}
    </group>
  )
}
const _v = new THREE.Vector3()
SoundBadge.deps = { world: storeWorld }
