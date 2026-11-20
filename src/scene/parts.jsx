/* 자주 쓰는 3D 조각들 */
export const Box = ({ p = [0, 0, 0], s = [1, 1, 1], c = '#ccc', r = 0.9, m = 0, rot, emissive, ei = 0, opacity, children, ...rest }) => (
  <mesh position={p} rotation={rot} {...rest}>
    <boxGeometry args={s} />
    <meshStandardMaterial
      color={c}
      roughness={r}
      metalness={m}
      emissive={emissive || '#000000'}
      emissiveIntensity={ei}
      transparent={opacity !== undefined}
      opacity={opacity ?? 1}
    />
    {children}
  </mesh>
)

export const Cyl = ({ p = [0, 0, 0], r = 0.1, rb, h = 1, c = '#ccc', seg = 16, rot, opacity, ...rest }) => (
  <mesh position={p} rotation={rot} {...rest}>
    <cylinderGeometry args={[r, rb ?? r, h, seg]} />
    <meshStandardMaterial color={c} roughness={0.9} transparent={opacity !== undefined} opacity={opacity ?? 1} />
  </mesh>
)

export const Sph = ({ p = [0, 0, 0], r = 0.1, c = '#ccc', sc, seg = 16, emissive, ei = 0, opacity, rough = 0.9, ...rest }) => (
  <mesh position={p} scale={sc} {...rest}>
    <sphereGeometry args={[r, seg, Math.max(8, Math.floor(seg * 0.75))]} />
    <meshStandardMaterial
      color={c}
      roughness={rough}
      emissive={emissive || '#000000'}
      emissiveIntensity={ei}
      transparent={opacity !== undefined}
      opacity={opacity ?? 1}
    />
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
