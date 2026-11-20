import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './scene/Scene'
import UI from './ui/UI'
import { useStore, setState, getState, world, toggleView, showToast } from './store'
import * as audio from './audio/AsmrEngine'

export default function App() {
  const started = useStore((s) => s.started)
  const mixer = useStore((s) => s.mixer)
  const rainLevel = useStore((s) => s.rainLevel)
  const running = useStore((s) => s.timer.running)

  // 환경음 믹서 → 오디오 엔진
  useEffect(() => {
    if (!started) return
    for (const k of ['rain', 'stew', 'leaves']) audio.setAmbient(k, mixer[k].on, mixer[k].vol)
  }, [started, mixer])

  useEffect(() => {
    if (started) audio.setRain(rainLevel)
  }, [started, rainLevel])

  // 25분 타이머
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const t = getState().timer
      if (t.left <= 1) {
        setState({ timer: { running: false, left: 1500 } })
        showToast('⏰ 25분 집중 완료! 잠깐 쉬어가요 🍵')
        audio.chime()
      } else setState({ timer: { ...t, left: t.left - 1 } })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  // 키보드 / 포인터
  useEffect(() => {
    const down = (e) => {
      if (e.target instanceof HTMLInputElement) return
      const c = e.code
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c)) e.preventDefault()
      if (!e.repeat) {
        if (c === 'KeyV') toggleView()
        else if (c === 'KeyH') setState((s) => ({ uiHidden: !s.uiHidden }))
      }
      world.keys.add(c)
    }
    const up = (e) => world.keys.delete(e.code)
    const blur = () => world.keys.clear()
    const release = () => {
      world.dragLock = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas
        camera={{ fov: 50, near: 0.05, far: 90, position: [0, 4, 6] }}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
        style={{ touchAction: 'none' }}
      >
        <Scene />
      </Canvas>
      <UI />
    </div>
  )
}
