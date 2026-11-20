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

/* 밤색 슬레이트 지붕 (골판 줄무늬) */
export const slateRoof = () =>
  make('slate', 128, 128, (g, w, h) => {
    g.fillStyle = '#6e4a3e'
    g.fillRect(0, 0, w, h)
    for (let x = 0; x < w; x += 16) {
      const gr = g.createLinearGradient(x, 0, x + 16, 0)
      gr.addColorStop(0, '#563a30')
      gr.addColorStop(0.5, '#8a6252')
      gr.addColorStop(1, '#563a30')
      g.fillStyle = gr
      g.fillRect(x, 0, 16, h)
    }
    for (let y = 0; y < h; y += 42) {
      g.fillStyle = 'rgba(0,0,0,.28)'
      g.fillRect(0, y, w, 3)
    }
  })

/* 대나무 돗자리 마루 (가는 대나무 살 + 엮은 실) */
export const bambooMat = (rep = [4, 3]) =>
  make(`bamboo-${rep}`, 512, 512, (g, w, h) => {
    g.fillStyle = '#b8894e'
    g.fillRect(0, 0, w, h)
    const slat = 7
    for (let y = 0; y < h; y += slat) {
      // 살마다 길이가 다른 조각 (벽돌쌓기처럼)
      let x = -((y / slat) % 3) * 40
      while (x < w) {
        const len = 60 + Math.random() * 70
        const v = (Math.random() * 30) | 0
        const gr = g.createLinearGradient(0, y, 0, y + slat)
        gr.addColorStop(0, `rgb(${206 + v},${162 + v * 0.8},${98 + v * 0.5})`)
        gr.addColorStop(1, `rgb(${168 + v},${122 + v * 0.7},${70 + v * 0.4})`)
        g.fillStyle = gr
        g.fillRect(x + 1, y + 0.5, len - 2, slat - 1)
        x += len
      }
    }
    g.fillStyle = 'rgba(90,60,30,.35)'
    for (const x of [128, 384]) g.fillRect(x, 0, 2, h)
  }, rep)

/* 짙은 원목 마루 / 천장 판재 */
export const woodPlank = (base = '#7a5235', rep = [4, 4], key = 'a') =>
  make(`plank-${base}-${rep}-${key}`, 256, 256, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    const c = new THREE.Color(base)
    for (let y = 0; y < h; y += 32) {
      const k = 0.85 + Math.random() * 0.3
      g.fillStyle = `rgb(${(c.r * 255 * k) | 0},${(c.g * 255 * k) | 0},${(c.b * 255 * k) | 0})`
      g.fillRect(0, y, w, 31)
      for (let i = 0; i < 14; i++) {
        g.strokeStyle = `rgba(40,20,10,${0.05 + Math.random() * 0.08})`
        g.beginPath()
        const yy = y + Math.random() * 30
        g.moveTo(0, yy)
        g.bezierCurveTo(w * 0.3, yy + 3, w * 0.6, yy - 3, w, yy + 1)
        g.stroke()
      }
      g.fillStyle = 'rgba(30,15,5,.45)'
      g.fillRect(0, y + 31, w, 1)
      g.fillRect(((y * 7) % w) | 0, y, 1, 31)
    }
  }, rep)

/* 하얀 타일 벽 (부엌) */
export const tileWall = () =>
  make('tilewall', 128, 128, (g, w, h) => {
    g.fillStyle = '#f2efe8'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = '#d6d1c6'
    g.lineWidth = 2
    for (let i = 0; i <= w; i += 32) {
      g.beginPath()
      g.moveTo(i, 0)
      g.lineTo(i, h)
      g.moveTo(0, i)
      g.lineTo(w, i)
      g.stroke()
    }
  }, [6, 3])

/* 회벽 */
export const plaster = () =>
  make('plaster', 256, 256, (g, w, h) => {
    g.fillStyle = '#ece6da'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '160,140,110'},${Math.random() * 0.06})`
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3)
    }
  }, [3, 2])

/* 얇은 커튼 */
export const curtainTex = () =>
  make('curtain', 64, 128, (g, w, h) => {
    g.fillStyle = 'rgba(250,248,242,0.92)'
    g.fillRect(0, 0, w, h)
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = 'rgba(200,190,170,.25)'
      g.fillRect(x, 0, 3, h)
    }
  })

/* TV 화면: 초록 들판 풍경 */
export const tvScreen = () =>
  make('tv', 256, 144, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.5)
    sky.addColorStop(0, '#8fbbe6')
    sky.addColorStop(1, '#dbe9f2')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#6f8f5a'
    g.beginPath()
    g.moveTo(0, h * 0.5)
    g.quadraticCurveTo(w * 0.3, h * 0.32, w * 0.6, h * 0.46)
    g.quadraticCurveTo(w * 0.8, h * 0.38, w, h * 0.48)
    g.lineTo(w, h)
    g.lineTo(0, h)
    g.fill()
    g.fillStyle = '#9cbf62'
    g.beginPath()
    g.moveTo(0, h * 0.68)
    g.quadraticCurveTo(w * 0.5, h * 0.55, w, h * 0.7)
    g.lineTo(w, h)
    g.lineTo(0, h)
    g.fill()
    g.strokeStyle = 'rgba(70,100,40,.4)'
    for (let i = 0; i < 12; i++) {
      g.beginPath()
      g.moveTo(w * 0.5, h * 0.6)
      g.lineTo(i * (w / 11), h)
      g.stroke()
    }
  })

/* 꽃무늬 앞치마 */
export const floralTex = () =>
  make('floral', 128, 128, (g, w, h) => {
    g.fillStyle = '#f6f1e8'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      g.fillStyle = ['#c9566a', '#e08a7c', '#b84a5a'][i % 3]
      for (let k = 0; k < 5; k++) {
        g.beginPath()
        g.arc(x + Math.cos(k * 1.26) * 4, y + Math.sin(k * 1.26) * 4, 3.2, 0, Math.PI * 2)
        g.fill()
      }
      g.fillStyle = '#6f8f4a'
      g.beginPath()
      g.ellipse(x + 7, y + 5, 4, 2, 0.6, 0, Math.PI * 2)
      g.fill()
    }
  }, [2, 2])

/* 따뜻한 색감 거실 러그 */
export const rugTex = () =>
  make('rug', 256, 256, (g, w, h) => {
    g.fillStyle = '#ddd2bf'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = '#8c7a62'
    g.lineWidth = 10
    g.strokeRect(12, 12, w - 24, h - 24)
    g.strokeStyle = '#b3a28a'
    g.lineWidth = 6
    g.strokeRect(30, 30, w - 60, h - 60)
    g.fillStyle = '#e8dfcf'
    g.beginPath()
    g.moveTo(w / 2, 52)
    g.lineTo(w - 52, h / 2)
    g.lineTo(w / 2, h - 52)
    g.lineTo(52, h / 2)
    g.closePath()
    g.fill()
    g.fillStyle = '#d3c6b0'
    g.beginPath()
    g.moveTo(w / 2, 92)
    g.lineTo(w - 92, h / 2)
    g.lineTo(w / 2, h - 92)
    g.lineTo(92, h / 2)
    g.closePath()
    g.fill()
    g.fillStyle = '#9b8a72'
    g.beginPath()
    g.arc(w / 2, h / 2, 18, 0, Math.PI * 2)
    g.fill()
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2)
    }
  })

/* 노란 미닫이문: 노란 틀 + 간유리 + 대각선 격자 장식 (사진 그대로) */
export const latticeTex = () =>
  make('lattice', 256, 512, (g, w, h) => {
    g.fillStyle = '#e8b923'
    g.fillRect(0, 0, w, h)
    const panes = [
      [22, 22, w - 44, 150],
      [22, 196, w - 44, 200],
    ]
    for (const [x, y, pw, ph] of panes) {
      g.fillStyle = '#d9e2df'
      g.fillRect(x, y, pw, ph)
      g.save()
      g.beginPath()
      g.rect(x, y, pw, ph)
      g.clip()
      // 대각선 띠 모양 격자
      g.strokeStyle = '#c89a6a'
      g.lineWidth = 2
      for (let k = -2; k < 7; k++) {
        const bx = x + k * 18
        for (let i = 0; i < 6; i++) {
          g.beginPath()
          g.moveTo(bx + i * 9, y + ph)
          g.lineTo(bx + i * 9 + ph * 0.75, y)
          g.stroke()
          g.beginPath()
          g.moveTo(bx + i * 9 - 30, y + ph)
          g.lineTo(bx + i * 9 + ph * 0.75 + 30, y)
          g.stroke()
        }
      }
      g.restore()
      g.globalCompositeOperation = 'destination-out'
      g.globalCompositeOperation = 'source-over'
    }
    // 대각선 띠 바깥은 간유리만 보이도록 덮기
    for (const [x, y, pw, ph] of panes) {
      g.fillStyle = 'rgba(217,226,223,0.92)'
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + pw * 0.55, y)
      g.lineTo(x, y + ph * 0.9)
      g.closePath()
      g.fill()
      g.beginPath()
      g.moveTo(x + pw, y + ph * 0.15)
      g.lineTo(x + pw, y + ph)
      g.lineTo(x + pw * 0.4, y + ph)
      g.closePath()
      g.fill()
    }
    g.fillStyle = '#e8b923'
    g.fillRect(0, 410, w, h - 410)
    g.fillStyle = '#8a6a2a'
    g.fillRect(w - 20, 250, 6, 30)
  })

/* 붉은 구멍 벽돌 기초 */
export const holeBrick = () =>
  make('hbrick', 256, 64, (g, w, h) => {
    g.fillStyle = '#e8e2d8'
    g.fillRect(0, 0, w, h)
    for (let row = 0; row < 2; row++) {
      const off = row ? -32 : 0
      for (let x = off; x < w; x += 64) {
        const v = (Math.random() * 30) | 0
        g.fillStyle = `rgb(${160 + v},${80 + v / 2},${58})`
        g.fillRect(x + 2, row * 32 + 2, 60, 28)
        g.fillStyle = 'rgba(40,20,10,.6)'
        for (let k = 0; k < 3; k++) {
          g.beginPath()
          g.arc(x + 14 + k * 18, row * 32 + 16, 6, 0, Math.PI * 2)
          g.fill()
        }
      }
    }
  }, [8, 1])

/* 밤색 금속 기와 (본채) */
export const metalTile = () =>
  make('mtile', 128, 128, (g, w, h) => {
    g.fillStyle = '#6e4a3e'
    g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 21) {
      for (let x = 0; x < w; x += 16) {
        const gr = g.createLinearGradient(x, 0, x + 16, 0)
        gr.addColorStop(0, '#4a2c26')
        gr.addColorStop(0.5, '#73473c')
        gr.addColorStop(1, '#4a2c26')
        g.fillStyle = gr
        g.fillRect(x, y, 16, 18)
      }
      g.fillStyle = 'rgba(120,70,50,.25)'
      g.fillRect(0, y + 18, w, 3)
    }
  })

/* 福 장식 */
export const bokTex = () =>
  make('bok', 128, 128, (g) => {
    g.fillStyle = '#9a6a5a'
    g.beginPath()
    g.moveTo(64, 4)
    g.lineTo(122, 40)
    g.lineTo(122, 124)
    g.lineTo(6, 124)
    g.lineTo(6, 40)
    g.closePath()
    g.fill()
    g.strokeStyle = '#f3ece0'
    g.lineWidth = 5
    g.stroke()
    g.fillStyle = '#f3ece0'
    g.font = 'bold 66px serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('福', 64, 80)
  })

/* 잔디 */
export const grassTex = () =>
  make('grass', 256, 256, (g, w, h) => {
    g.fillStyle = '#6f9a45'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 5000; i++) {
      const v = (Math.random() * 50) | 0
      g.fillStyle = `rgba(${80 + v},${130 + v / 2},${40 + v / 2},.5)`
      g.fillRect(Math.random() * w, Math.random() * h, 1.5, 3 + Math.random() * 3)
    }
  }, [14, 14])

/* 장판 */
export const jangpan = () =>
  make('jangpan', 128, 128, (g, w, h) => {
    g.fillStyle = '#d4a868'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(120,70,20,.35)'
    g.lineWidth = 1
    for (let i = 0; i <= w; i += 32) {
      g.beginPath()
      g.moveTo(i, 0)
      g.lineTo(i, h)
      g.moveTo(0, i)
      g.lineTo(w, i)
      g.stroke()
    }
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(150,90,30,${Math.random() * 0.08})`
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3)
    }
  }, [4, 2])

/* 부엌 체크 타일 */
export const kitchenTile = () =>
  make('ktile', 64, 64, (g) => {
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        g.fillStyle = (x + y) % 2 ? '#fbf5e8' : '#e6dcc6'
        g.fillRect(x * 32, y * 32, 32, 32)
      }
  }, [6, 10])

/* 마당 흙/시멘트 */
export const yardGround = () =>
  make('yard', 256, 256, (g, w, h) => {
    g.fillStyle = '#b7b2a6'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 2500; i++) {
      const v = (Math.random() * 40) | 0
      g.fillStyle = `rgba(${120 + v},${115 + v},${105 + v},.25)`
      g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3)
    }
  }, [6, 6])

/* 돌담 */
export const stoneWall = () =>
  make('stone', 128, 64, (g, w, h) => {
    g.fillStyle = '#5d5a52'
    g.fillRect(0, 0, w, h)
    for (let row = 0; row < 4; row++) {
      let x = row % 2 ? -10 : 0
      while (x < w) {
        const sw = 18 + Math.random() * 16
        const v = (Math.random() * 40) | 0
        g.fillStyle = `rgb(${130 + v},${124 + v},${110 + v})`
        g.beginPath()
        g.ellipse(x + sw / 2, row * 16 + 8, sw / 2 - 1.5, 6.5, 0, 0, Math.PI * 2)
        g.fill()
        x += sw
      }
    }
  }, [6, 1])

/* 벽시계 문자판 */
export const clockFace = () =>
  make('clock', 128, 128, (g, w) => {
    g.fillStyle = '#fffaf0'
    g.beginPath()
    g.arc(64, 64, 62, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#3a2a1a'
    g.font = 'bold 15px sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2
      g.fillText(String(i), 64 + Math.sin(a) * 47, 64 - Math.cos(a) * 47)
    }
  })

/* 부드러운 원 (김, 연기) */
export const softDot = () =>
  make('soft', 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    gr.addColorStop(0, 'rgba(255,255,255,0.9)')
    gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, 64, 64)
  })

/* 이모지 스프라이트 (❤️ 등) */
export const emojiTex = (ch) =>
  make('emoji-' + ch, 128, 128, (g) => {
    g.font = '96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(ch, 64, 70)
  })

/* 하늘 그라데이션 (맑은 오후 / 비 오는 저녁) */
export const skyTex = (night = false) =>
  make('sky' + night, 4, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h)
    if (night) {
      gr.addColorStop(0, '#2d3550')
      gr.addColorStop(0.55, '#4a4f6a')
      gr.addColorStop(1, '#7a6f78')
    } else {
      gr.addColorStop(0, '#7fb2df')
      gr.addColorStop(0.55, '#bcd8ea')
      gr.addColorStop(0.9, '#f3e6cf')
      gr.addColorStop(1, '#f6dcb8')
    }
    g.fillStyle = gr
    g.fillRect(0, 0, w, h)
  })
