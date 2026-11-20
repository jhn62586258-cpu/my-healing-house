import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world, moveTo } from '../store'
import { roofTile, woodFloor } from './textures'
import { Box, Cyl } from './parts'

const WALL = '#f0e4c9'
const WOOD = '#8a5a34'
const WOOD_D = '#6b4426'

function Slope({ x0, x1, a, b, mat }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const v = new Float32Array([x0, a[1], a[0], x1, a[1], a[0], x1, b[1], b[0], x0, b[1], b[0]])
    g.setAttribute('position', new THREE.BufferAttribute(v, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 14, 0, 14, 5, 0, 5]), 2))
    g.setIndex([0, 1, 2, 0, 2, 3])
    g.computeVertexNormals()
    return g
  }, [x0, x1, a, b])
  return <mesh geometry={geo} material={mat} />
}

function Gable({ x }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(6, 3)
    s.lineTo(0, 3)
    s.lineTo(0, 3.88)
    s.lineTo(2, 4.7)
    s.lineTo(6, 3.18)
    s.closePath()
    return new THREE.ShapeGeometry(s)
  }, [])
  return (
    <mesh geometry={geo} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      <meshStandardMaterial color="#e8d8b8" roughness={1} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Window({ x }) {
  const z = -6.05
  return (
    <group position={[x, 1.85, z]}>
      <mesh>
        <planeGeometry args={[1.6, 1.2]} />
        <meshStandardMaterial color="#a6c8e0" transparent opacity={0.12} roughness={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Box p={[0, 0.6, 0]} s={[1.7, 0.06, 0.16]} c={WOOD} />
      <Box p={[0, -0.6, 0]} s={[1.7, 0.06, 0.16]} c={WOOD} />
      <Box p={[-0.8, 0, 0]} s={[0.06, 1.2, 0.16]} c={WOOD} />
      <Box p={[0.8, 0, 0]} s={[0.06, 1.2, 0.16]} c={WOOD} />
      <Box p={[0, 0, 0]} s={[0.04, 1.2, 0.1]} c={WOOD} />
      <Box p={[-0.4, 0, 0]} s={[0.03, 1.2, 0.08]} c={WOOD} />
      <Box p={[0.4, 0, 0]} s={[0.03, 1.2, 0.08]} c={WOOD} />
      <Box p={[0, 0.2, 0]} s={[1.6, 0.03, 0.08]} c={WOOD} />
      <Box p={[0, -0.2, 0]} s={[1.6, 0.03, 0.08]} c={WOOD} />
    </group>
  )
}

export default function House() {
  const roofMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: roofTile(), color: '#9aa0aa', roughness: 0.85, side: THREE.DoubleSide, transparent: true }),
    []
  )
  const roomTex = useMemo(() => woodFloor('#c99a63', [3, 3]), [])
  const livTex = useMemo(() => woodFloor('#d6a45e', [5, 3]), [])
  const porchTex = useMemo(() => woodFloor('#a8784a', [8, 1]), [])

  useFrame(() => {
    const o = world.fx.roof
    roofMat.opacity = o
    roofMat.depthWrite = o > 0.95
  })

  return (
    <group>
      {/* 바닥 3종 (클릭 이동) */}
      <mesh position={[-7, 0.075, -3]} onClick={moveTo}>
        <boxGeometry args={[6, 0.15, 6]} />
        <meshStandardMaterial map={roomTex} roughness={0.8} />
      </mesh>
      <mesh position={[1, 0.075, -3]} onClick={moveTo}>
        <boxGeometry args={[10, 0.15, 6]} />
        <meshStandardMaterial map={livTex} roughness={0.7} />
      </mesh>
      <mesh position={[-2, 0.075, 0.95]} onClick={moveTo}>
        <boxGeometry args={[16, 0.15, 1.9]} />
        <meshStandardMaterial map={porchTex} roughness={0.9} />
      </mesh>
      {/* 댓돌 */}
      <Box p={[-2, 0.04, 2.15]} s={[3, 0.08, 0.5]} c="#9a9a96" />

      {/* 뒷벽 (창문 구멍) */}
      <Box p={[-8.1, 1.5, -6.05]} s={[4.2, 3, 0.2]} c={WALL} />
      <Box p={[0.9, 1.5, -6.05]} s={[10.6, 3, 0.2]} c={WALL} />
      <Box p={[-5.2, 0.625, -6.05]} s={[1.6, 1.25, 0.2]} c={WALL} />
      <Box p={[-5.2, 2.725, -6.05]} s={[1.6, 0.55, 0.2]} c={WALL} />
      <Window x={-5.2} />
      {/* 옆벽, 칸막이 */}
      <Box p={[-10.1, 1.5, -3]} s={[0.2, 3, 6]} c={WALL} />
      <Box p={[6.1, 1.5, -3]} s={[0.2, 3, 6]} c={WALL} />
      <Box p={[-4, 1.5, -4.2]} s={[0.2, 3, 3.6]} c={WALL} />
      <Box p={[-4, 2.7, -1.2]} s={[0.2, 0.6, 2.4]} c={WALL} />
      <Gable x={-10.1} />
      <Gable x={6.1} />

      {/* 기둥과 보 */}
      {[-9.9, -4, 2, 5.9].map((x) => (
        <Cyl key={'a' + x} p={[x, 1.5, 0.1]} r={0.1} h={3} c={WOOD} />
      ))}
      {[-9.8, -4, 2.5, 5.8].map((x) => (
        <Cyl key={'b' + x} p={[x, 1.45, 1.85]} r={0.08} h={2.75} c={WOOD} />
      ))}
      <Box p={[-2, 2.88, 0.1]} s={[16.4, 0.25, 0.25]} c={WOOD_D} />
      <Box p={[-2, 2.82, 1.85]} s={[16.4, 0.2, 0.2]} c={WOOD_D} />

      {/* 기와지붕 (3인칭에선 반투명) */}
      <Slope x0={-10.8} x1={6.8} a={[-6.6, 2.95]} b={[-2.0, 4.7]} mat={roofMat} />
      <Slope x0={-10.8} x1={6.8} a={[-2.0, 4.7]} b={[2.55, 2.85]} mat={roofMat} />
      <mesh position={[-2, 4.72, -2]} material={roofMat}>
        <boxGeometry args={[17.6, 0.2, 0.28]} />
      </mesh>
      <Box p={[-2, 2.82, 2.55]} s={[17.6, 0.14, 0.1]} c={WOOD_D} />
      <Box p={[-2, 2.92, -6.65]} s={[17.6, 0.14, 0.1]} c={WOOD_D} />

      {/* 조명 */}
      <hemisphereLight args={['#aab8c8', '#6b5a48', 0.6]} />
      <directionalLight position={[6, 10, 8]} intensity={0.35} color="#cdd7e6" />
    </group>
  )
}
