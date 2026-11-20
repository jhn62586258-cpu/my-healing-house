/* ──────────────────────────────────────────────
   Web Audio API 합성 ASMR 엔진 (외부 mp3 없음)
   ────────────────────────────────────────────── */
let ctx = null
let master = null
const bufs = {}
const amb = {}
const layers = {}

const rnd = (a, b) => a + Math.random() * (b - a)

function makeNoise(type) {
  const len = ctx.sampleRate * 3
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  if (type === 'white') {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.969 * b2 + w * 0.153852
      b3 = 0.8665 * b3 + w * 0.3104856
      b4 = 0.55 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.016898
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  } else {
    let last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    }
  }
  return buf
}

function src(type, loop = false) {
  const s = ctx.createBufferSource()
  s.buffer = bufs[type]
  s.loop = loop
  return s
}

let route = null // 세션 버스 (5~7초 재생 후 페이드 아웃)
function toOut(node, pan = 0, dest) {
  const d = dest || route || master
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner()
    p.pan.value = pan
    node.connect(p)
    p.connect(d)
    return p
  }
  node.connect(d)
  return node
}

function burst(o) {
  const { type = 'white', t = ctx.currentTime, dur = 0.05, freq = 2000, q = 1, peak = 0.4, filter = 'bandpass', pan = 0, dest, attack = 0.002 } = o
  const s = src(type)
  const f = ctx.createBiquadFilter()
  f.type = filter
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur)
  s.connect(f)
  f.connect(g)
  toOut(g, pan, dest)
  s.start(t, Math.random() * 2, attack + dur + 0.05)
}

function tone(o) {
  const { freq = 440, to = null, t = ctx.currentTime, dur = 0.1, peak = 0.3, type = 'sine', pan = 0, dest, attack = 0.003 } = o
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur)
  osc.connect(g)
  toOut(g, pan, dest)
  osc.start(t)
  osc.stop(t + attack + dur + 0.05)
}

/* ───────── 환경음 레이어 ───────── */
const mix = { rain: 0.75, stew: 1, kettle: 1, birds: 0.8 } // 거리/실내에 따른 볼륨 배율

function loopLayer(type, ftype, freq, gain, dest) {
  const s = src(type, true)
  const f = ctx.createBiquadFilter()
  f.type = ftype
  f.frequency.value = freq
  const g = ctx.createGain()
  g.gain.value = gain
  s.connect(f)
  f.connect(g)
  g.connect(dest)
  s.start(0, Math.random() * 2)
  return { f, g }
}

function buildAmbient() {
  for (const k of ['rain', 'stew', 'kettle', 'birds']) {
    const out = ctx.createGain()
    out.gain.value = 0
    out.connect(master)
    amb[k] = { out, on: false, timer: null }
  }
  // 잔잔한 빗소리
  layers.rainA = loopLayer('pink', 'lowpass', 3800, 0.45, amb.rain.out)
  layers.rainB = loopLayer('white', 'highpass', 5000, 0.035, amb.rain.out)
  layers.rainC = loopLayer('brown', 'lowpass', 280, 0.12, amb.rain.out)
  // 맑은 오후: 산들바람
  loopLayer('pink', 'lowpass', 520, 0.05, amb.birds.out)
  // 된장찌개 보글보글
  loopLayer('brown', 'lowpass', 480, 0.55, amb.stew.out)
  loopLayer('white', 'highpass', 4200, 0.015, amb.stew.out)
  // 양은 주전자 '뿌우~' 휘슬
  const w = ctx.createOscillator()
  w.type = 'sine'
  w.frequency.value = 1720
  const vib = ctx.createOscillator()
  vib.frequency.value = 5.2
  const vg = ctx.createGain()
  vg.gain.value = 22
  vib.connect(vg)
  vg.connect(w.frequency)
  const wg = ctx.createGain()
  wg.gain.value = 0.05
  const trem = ctx.createOscillator()
  trem.frequency.value = 0.23
  const tg = ctx.createGain()
  tg.gain.value = 0.025
  trem.connect(tg)
  tg.connect(wg.gain)
  w.connect(wg)
  wg.connect(amb.kettle.out)
  w.start()
  vib.start()
  trem.start()
  const breath = loopLayer('white', 'bandpass', 1750, 0.12, amb.kettle.out)
  breath.f.Q.value = 7
  loopLayer('brown', 'lowpass', 400, 0.3, amb.kettle.out) // 끓는 물
}

const EVENTS = {
  birds: {
    // 작은 새 짹짹 (두세 번 연달아)
    fn: () => {
      const pan = rnd(-0.8, 0.8)
      const base = rnd(2600, 4200)
      const n = 2 + Math.floor(Math.random() * 3)
      const t = ctx.currentTime
      for (let i = 0; i < n; i++) tone({ freq: base, to: base * rnd(1.15, 1.4), t: t + i * rnd(0.09, 0.14), dur: 0.07, peak: 0.05, dest: amb.birds.out, pan })
    },
    ms: () => rnd(1400, 4200),
  },
  rain: {
    fn: () => {
      tone({ freq: rnd(1400, 2600), to: rnd(700, 1000), dur: 0.05, peak: 0.05, dest: amb.rain.out, pan: rnd(-0.8, 0.8) })
      if (Math.random() < 0.25) burst({ freq: rnd(3000, 6000), q: 1, dur: 0.03, peak: 0.06, dest: amb.rain.out, pan: rnd(-0.8, 0.8) })
    },
    ms: () => rnd(300, 700),
  },
  stew: {
    fn: () => {
      const pan = rnd(-0.3, 0.3)
      tone({ freq: rnd(180, 320), to: rnd(380, 620), dur: 0.09, peak: 0.14, dest: amb.stew.out, pan })
      burst({ freq: rnd(900, 1800), q: 1, dur: 0.04, peak: 0.12, dest: amb.stew.out, pan })
    },
    ms: () => rnd(90, 260),
  },
  kettle: {
    fn: () => tone({ freq: rnd(160, 260), to: rnd(320, 480), dur: 0.08, peak: 0.07, dest: amb.kettle.out, pan: rnd(-0.2, 0.2) }),
    ms: () => rnd(120, 320),
  },
}

function startEvents(k) {
  const a = amb[k]
  if (a.timer) return
  const tick = () => {
    if (!a.on) {
      a.timer = null
      return
    }
    EVENTS[k].fn()
    a.timer = setTimeout(tick, EVENTS[k].ms())
  }
  tick()
}

function applyGain(k, slow) {
  const a = amb[k]
  a.out.gain.setTargetAtTime(a.on ? mix[k] : 0, ctx.currentTime, slow ? 0.6 : 0.15)
}

export function ensureAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    const comp = ctx.createDynamicsCompressor()
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(comp)
    comp.connect(ctx.destination)
    for (const t of ['white', 'pink', 'brown']) bufs[t] = makeNoise(t)
    buildAmbient()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

/* 빗소리 · 찌개 · 주전자 켜고 끄기 */
export function setAmbient(name, on) {
  if (!ctx || !amb[name]) return
  amb[name].on = on
  applyGain(name, name === 'kettle' && on)
  if (on) startEvents(name)
}

/* 플레이어 위치에 따른 볼륨 (실내면 빗소리 작게, 사물과 멀면 작게) */
export function setMix(patch) {
  Object.assign(mix, patch)
  if (!ctx) return
  for (const k of Object.keys(patch)) if (amb[k] && amb[k].on) applyGain(k)
}

/* ───────── 효과음 ───────── */
export function pop() {
  if (!ensureAudio()) return
  const t = ctx.currentTime
  const pan = rnd(-0.5, 0.5)
  burst({ t, dur: 0.05, freq: rnd(1800, 2600), q: 1.4, peak: 0.55, pan })
  tone({ freq: rnd(700, 1100), to: 140, t, dur: 0.06, peak: 0.5, pan })
  burst({ t: t + 0.028, dur: 0.03, freq: rnd(3500, 5000), q: 0.8, peak: 0.3, filter: 'highpass', pan })
}

export function key(i = 0) {
  if (!ensureAudio()) return
  const t = ctx.currentTime
  const pan = (i - 1.5) * 0.15
  burst({ t, dur: 0.03, freq: 2500, q: 0.8, peak: 0.5, pan })
  tone({ freq: 220 * (1 + i * 0.07), to: 110, t, dur: 0.06, peak: 0.35, type: 'triangle', pan })
  burst({ t: t + 0.08, dur: 0.02, freq: 4000, q: 0.7, peak: 0.25, filter: 'highpass', pan })
}

export function squish() {
  if (!ensureAudio()) return
  const t = ctx.currentTime
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(300, t)
  o.frequency.exponentialRampToValueAtTime(700, t + 0.09)
  o.frequency.exponentialRampToValueAtTime(420, t + 0.22)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.35, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26)
  o.connect(g)
  toOut(g, 0)
  o.start(t)
  o.stop(t + 0.3)
  tone({ freq: 900, to: 1300, t: t + 0.02, dur: 0.1, peak: 0.08 })
}

export function pencil(dur = 1.6) {
  if (!ensureAudio()) return
  const t = ctx.currentTime
  const s = src('white')
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 0.6
  bp.frequency.setValueAtTime(3000, t)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  let k = t + 0.05
  let dir = true
  while (k < t + dur - 0.1) {
    const len = rnd(0.1, 0.2)
    g.gain.linearRampToValueAtTime(rnd(0.18, 0.34), k + len * 0.3)
    g.gain.linearRampToValueAtTime(0.03, k + len)
    bp.frequency.linearRampToValueAtTime(dir ? 4600 : 2800, k + len)
    dir = !dir
    k += len + rnd(0, 0.03)
  }
  g.gain.linearRampToValueAtTime(0.0001, t + dur)
  s.connect(bp)
  bp.connect(g)
  toOut(g, rnd(-0.2, 0.2))
  s.start(t, rnd(0, 2), dur + 0.1)
}

export function earPick(dur = 2.6) {
  if (!ensureAudio()) return
  const t = ctx.currentTime
  const s = src('pink')
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 900
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2800
  bp.Q.value = 0.35
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 7000
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.4, t + 0.5)
  g.gain.setValueAtTime(0.4, t + dur - 0.7)
  g.gain.linearRampToValueAtTime(0.0001, t + dur)
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 4.5
  const lg = ctx.createGain()
  lg.gain.value = 0.16
  lfo.connect(lg)
  lg.connect(g.gain)
  lfo.start(t)
  lfo.stop(t + dur + 0.1)
  s.connect(hp)
  hp.connect(bp)
  bp.connect(lp)
  lp.connect(g)
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner()
    p.pan.setValueAtTime(-0.8, t)
    p.pan.linearRampToValueAtTime(0.8, t + dur * 0.5)
    p.pan.linearRampToValueAtTime(-0.5, t + dur)
    g.connect(p)
    p.connect(master)
  } else g.connect(master)
  s.start(t, rnd(0, 2), dur + 0.1)
}

export function chime() {
  if (!ensureAudio()) return
  const t = ctx.currentTime
  const roots = [1318.5, 1568, 1760, 2093]
  const parts = [
    [1, 0.14, 2.8],
    [2.01, 0.06, 1.8],
    [3.97, 0.035, 1.1],
    [5.4, 0.02, 0.7],
  ]
  let st = t
  for (let n = 0; n < 4; n++) {
    const base = roots[Math.floor(Math.random() * roots.length)]
    const pan = rnd(-0.3, 0.3)
    for (const [m, amp, d] of parts) tone({ freq: base * m, t: st, dur: d, peak: amp, pan })
    st += rnd(0.25, 0.45)
  }
}

export function leaves(dur = 2.8) {
  if (!ensureAudio()) return
  const t0 = ctx.currentTime
  let k = 0
  while (k < dur) {
    const pan = rnd(-0.5, 0.5)
    burst({ t: t0 + k, dur: rnd(0.02, 0.07), freq: rnd(2500, 6500), q: rnd(0.4, 1.2), peak: rnd(0.15, 0.45), pan })
    if (Math.random() < 0.35) burst({ type: 'pink', t: t0 + k + 0.01, dur: 0.12, freq: rnd(800, 1600), q: 0.5, peak: 0.15, pan })
    if (Math.random() < 0.18) {
      // 도토리 사각사각
      burst({ t: t0 + k, dur: 0.05, freq: 2200, q: 2, peak: 0.5, pan })
      burst({ t: t0 + k + 0.06, dur: 0.04, freq: 3200, q: 2, peak: 0.35, pan })
    }
    k += rnd(0.03, 0.14)
  }
}

/* 강아지 멍멍 (size 클수록 낮고 굵게) */
export function bark(size = 1, times = 2) {
  if (!ensureAudio()) return
  const t0 = ctx.currentTime
  for (let i = 0; i < times; i++) {
    const t = t0 + i * 0.24
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(560 / size, t)
    o.frequency.exponentialRampToValueAtTime(300 / size, t + 0.13)
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 1100 / Math.sqrt(size)
    f.Q.value = 1.4
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.55, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    o.connect(f)
    f.connect(g)
    toOut(g, 0)
    o.start(t)
    o.stop(t + 0.2)
    burst({ type: 'pink', t, dur: 0.08, freq: 800 / size, q: 0.8, peak: 0.25 })
  }
}

/* 푸들 낑~ 기분 좋은 소리 */
export function whine() {
  if (!ensureAudio()) return
  const t = ctx.currentTime
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(950, t)
  o.frequency.linearRampToValueAtTime(1450, t + 0.16)
  o.frequency.linearRampToValueAtTime(1100, t + 0.4)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.18, t + 0.04)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
  o.connect(g)
  toOut(g, 0)
  o.start(t)
  o.stop(t + 0.5)
  tone({ freq: 1800, to: 2600, t: t + 0.45, dur: 0.08, peak: 0.08 })
}

/* 미닫이 유리문 드르륵 */
export function doorSlide() {
  if (!ensureAudio()) return
  const t = ctx.currentTime
  const s = src('brown')
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.setValueAtTime(380, t)
  f.frequency.linearRampToValueAtTime(260, t + 0.7)
  f.Q.value = 1.2
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.5, t + 0.08)
  g.gain.linearRampToValueAtTime(0.35, t + 0.55)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75)
  const am = ctx.createOscillator()
  am.frequency.value = 26
  const ag = ctx.createGain()
  ag.gain.value = 0.12
  am.connect(ag)
  ag.connect(g.gain)
  am.start(t)
  am.stop(t + 0.8)
  s.connect(f)
  f.connect(g)
  toOut(g, 0)
  s.start(t, rnd(0, 2), 0.8)
  burst({ t: t + 0.72, dur: 0.04, freq: 1600, q: 2, peak: 0.25 })
}

/* 옛날 전화기 따르릉 */
export function ring() {
  if (!ensureAudio()) return
  const t0 = ctx.currentTime
  for (let r = 0; r < 2; r++) {
    const t = t0 + r * 0.9
    for (const fq of [1050, 1280]) {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = fq
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      const am = ctx.createOscillator()
      am.type = 'square'
      am.frequency.value = 22
      const ag = ctx.createGain()
      ag.gain.value = 0.06
      am.connect(ag)
      ag.connect(g.gain)
      g.gain.setValueAtTime(0.06, t)
      g.gain.setValueAtTime(0.06, t + 0.6)
      g.gain.linearRampToValueAtTime(0, t + 0.65)
      o.connect(g)
      toOut(g, 0)
      o.start(t)
      am.start(t)
      o.stop(t + 0.7)
      am.stop(t + 0.7)
    }
  }
}

/* TV 채널 지지직 */
export function tvStatic() {
  if (!ensureAudio()) return
  burst({ dur: 0.28, freq: 3000, q: 0.3, peak: 0.2, attack: 0.01 })
  tone({ freq: 15700, dur: 0.3, peak: 0.01 })
}

/* 편지지 바스락 */
export function paper() {
  if (!ensureAudio()) return
  const t = ctx.currentTime
  for (let k = 0; k < 0.5; k += rnd(0.03, 0.08)) burst({ t: t + k, dur: rnd(0.03, 0.08), freq: rnd(2500, 5000), q: 0.6, peak: rnd(0.08, 0.2), filter: 'bandpass' })
}

/* 다람쥐 찍찍 */
export function squirrel() {
  if (!ensureAudio()) return
  const t = ctx.currentTime
  for (let i = 0; i < 4; i++) tone({ freq: rnd(3200, 4200), to: rnd(2200, 2800), t: t + i * 0.07, dur: 0.04, peak: 0.08, pan: 0.3 })
}

/* 처마 풍경 땡그랑 (금속 종) */
export function windBell() {
  if (!ensureAudio()) return
  const t0 = ctx.currentTime
  const base = rnd(1150, 1300)
  for (let n = 0; n < 3; n++) {
    const t = t0 + n * rnd(0.35, 0.6)
    const amp = 1 - n * 0.3
    for (const [m, a, d] of [
      [1, 0.16, 3.2],
      [2.76, 0.07, 1.8],
      [5.4, 0.035, 0.9],
    ])
      tone({ freq: base * m * (n === 1 ? 1.06 : 1), t, dur: d, peak: a * amp, pan: rnd(-0.2, 0.2) })
  }
}

/* ───────── 들렸다가 사라지는 사운드 세션 ─────────
   fn 을 gap 간격으로 반복 재생하다가, 마지막 fade ms 동안 볼륨을 서서히 줄여 끝냄 */
export function session(fn, { dur = 6000, gap = [700, 1300], fade = 2200, once = false } = {}) {
  if (!ensureAudio()) return 0
  const bus = ctx.createGain()
  bus.connect(master)
  const t0 = ctx.currentTime
  bus.gain.setValueAtTime(1, t0)
  bus.gain.setValueAtTime(1, t0 + Math.max(0, dur - fade) / 1000)
  bus.gain.linearRampToValueAtTime(0.0001, t0 + dur / 1000)
  const end = performance.now() + dur
  const tick = () => {
    if (performance.now() > end - 500) return
    route = bus
    try {
      fn()
    } finally {
      route = null
    }
    if (!once) setTimeout(tick, rnd(gap[0], gap[1]))
  }
  tick()
  setTimeout(() => bus.disconnect(), dur + 800)
  return end
}

/* 찌개·주전자처럼 이어지는 소리: ms 동안 켰다가 부드럽게 꺼짐 */
const ambTimers = {}
export function ambientFor(name, ms = 6500) {
  if (!ensureAudio() || !amb[name]) return 0
  setAmbient(name, true)
  clearTimeout(ambTimers[name])
  ambTimers[name] = setTimeout(() => {
    amb[name].on = false
    amb[name].out.gain.setTargetAtTime(0, ctx.currentTime, 0.7)
  }, Math.max(500, ms - 2200))
  return performance.now() + ms
}

