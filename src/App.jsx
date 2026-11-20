import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './scene/Scene'
import UI from './ui/UI'
import { useStore, setState, world, toggleView } from './store'
import * as audio from './audio/AsmrEngine'

export default function App() {
  const started = useStore((s) => s.started)
  const rainOn = useStore((s) => s.rainOn)
  const bgmOn = useStore((s) => s.bgmOn)

  // 입장하면 잔잔한 빗소리만 기본으로
  // 맑은 날: 산들바람 + 새소리 / 비 모드: 빗소리
  useEffect(() => {
    if (!started) return
    audio.setAmbient('rain', bgmOn && rainOn)
    audio.setAmbient('birds', bgmOn && !rainOn)
  }, [started, rainOn, bgmOn])

  // 키보드
  useEffect(() => {
    const down = (e) => {
      const c = e.code
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c)) e.preventDefault()
      if (!e.repeat) {
        if (c === 'KeyV') toggleView()
        else if (c === 'Escape') setState({ letter: -1 })
      }
      world.keys.add(c)
    }
    const up = (e) => world.keys.delete(e.code)
    const blur = () => world.keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows="percentage" camera={{ fov: 55, near: 0.05, far: 160, position: [-0.4, 3, 6.2] }} dpr={[1, 1.75]} gl={{ antialias: true, toneMappingExposure: 1.0 }} style={{ touchAction: 'none' }}>
        <Scene />
      </Canvas>
      <UI />
    </div>
  )
}
