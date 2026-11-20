import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { softDot, emojiTex } from './textures'

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
