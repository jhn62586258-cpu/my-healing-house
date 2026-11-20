import * as THREE from 'three'

/* 캔버스로 직접 그리는 텍스처 (외부 이미지 없음) */
const cache = new Map()

function make(key, w, h, draw, repeat) {
  if (cache.has(key)) return cache.get(key)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  if (repeat) tex.repeat.set(repeat[0], repeat[1])
  cache.set(key, tex)
  return tex
}

/* 체크무늬 (수면바지, 담요) */
export const plaid = (base, line, line2, rep = [2, 2]) =>
  make(`plaid-${base}-${line}-${line2}-${rep}`, 128, 128, (g) => {
    g.fillStyle = base
    g.fillRect(0, 0, 128, 128)
    g.globalAlpha = 0.55
    g.fillStyle = line
    g.fillRect(0, 20, 128, 22)
    g.fillRect(20, 0, 22, 128)
    g.globalAlpha = 0.5
    g.fillStyle = line2
    g.fillRect(0, 76, 128, 8)
    g.fillRect(76, 0, 8, 128)
    g.globalAlpha = 0.9
    g.fillStyle = line
    g.fillRect(0, 100, 128, 2)
    g.fillRect(100, 0, 2, 128)
  }, rep)

/* 마루 / 장판 */
export const woodFloor = (base = '#c99a63', rep = [3, 3]) =>
  make(`wood-${base}-${rep}`, 256, 256, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 8; i++) {
      g.fillStyle = `rgba(${(60 + Math.random() * 30) | 0},40,20,${0.05 + Math.random() * 0.08})`
      g.fillRect(i * 32, 0, 32, h)
    }
    g.strokeStyle = 'rgba(60,35,15,.45)'
    g.lineWidth = 2
    for (let i = 0; i <= 8; i++) {
      g.beginPath()
      g.moveTo(i * 32, 0)
      g.lineTo(i * 32, h)
      g.stroke()
    }
    g.strokeStyle = 'rgba(60,35,15,.12)'
    g.lineWidth = 1
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + (Math.random() - 0.5) * 4, y + 20 + Math.random() * 40)
      g.stroke()
    }
    g.strokeStyle = 'rgba(60,35,15,.4)'
    g.lineWidth = 2
    for (let i = 0; i < 5; i++) {
      const x = ((Math.random() * 8) | 0) * 32
      const y = Math.random() * h
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + 32, y)
      g.stroke()
    }
  }, rep)

/* 기와 */
export const roofTile = () =>
  make('tile', 128, 128, (g, w, h) => {
    g.fillStyle = '#5b606a'
    g.fillRect(0, 0, w, h)
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = '#454953'
      g.fillRect(x, 0, 3, h)
      g.fillStyle = '#707580'
      g.fillRect(x + 3, 0, 2, h)
    }
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = 'rgba(0,0,0,.25)'
      g.fillRect(0, y, w, 4)
    }
  }, [1, 1])
