import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../store'

const MAX = 3200
const rnd = (a, b) => a + Math.random() * (b - a)

const vert = /* glsl */ `
  attribute float aEnd;
  attribute float aSeed;
  uniform float uPhase;
  uniform float uLen;
  varying float vEnd;
  void main() {
    vec3 p = position;
    float fall = uPhase * (0.75 + aSeed * 0.5);
    float y = mod(p.y - fall, 10.0);
    p.y = y + aEnd * uLen;
    p.x += aEnd * uLen * 0.10;
    vEnd = aEnd;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`
const frag = /* glsl */ `
  varying float vEnd;
  uniform float uAlpha;
  void main() {
    gl_FragColor = vec4(0.78, 0.88, 1.0, uAlpha * (1.0 - vEnd * 0.8));
  }
`

/* 집 지붕 위를 피해서 내리는 빗줄기 */
export default function Rain() {
  const level = useStore((s) => s.rainLevel)
  const mat = useRef()
  const geo = useRef()
  const st = useRef({ speed: 9, alpha: 0.35, len: 0.5, phase: 0 })

  const { pos, end, seed } = useMemo(() => {
    const pos = new Float32Array(MAX * 6)
    const end = new Float32Array(MAX * 2)
    const seed = new Float32Array(MAX * 2)
    let i = 0
    while (i < MAX) {
      const x = rnd(-17, 17)
      const z = rnd(-10, 15)
      if (x > -11 && x < 7.2 && z > -7 && z < 2.7) continue
      const y = Math.random() * 10
      pos.set([x, y, z, x, y, z], i * 6)
      end[i * 2] = 0
      end[i * 2 + 1] = 1
      const s = Math.random()
      seed[i * 2] = s
      seed[i * 2 + 1] = s
      i++
    }
    return { pos, end, seed }
  }, [])

  const uniforms = useMemo(() => ({ uPhase: { value: 0 }, uLen: { value: 0.5 }, uAlpha: { value: 0.35 } }), [])

  useEffect(() => {
    if (geo.current) geo.current.setDrawRange(0, (level >= 2 ? 3200 : 800) * 2)
  }, [level])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = st.current
    const heavy = level >= 2
    const k = Math.min(1, dt * 2)
    s.speed += ((heavy ? 16 : 9) - s.speed) * k
    s.alpha += ((heavy ? 0.5 : 0.32) - s.alpha) * k
    s.len += ((heavy ? 0.9 : 0.5) - s.len) * k
    s.phase += dt * s.speed
    uniforms.uPhase.value = s.phase
    uniforms.uAlpha.value = s.alpha
    uniforms.uLen.value = s.len
  })

  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        <bufferAttribute attach="attributes-aEnd" args={[end, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[seed, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={vert} fragmentShader={frag} transparent depthWrite={false} />
    </lineSegments>
  )
}
