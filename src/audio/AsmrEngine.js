/* ──────────────────────────────────────────────
   Web Audio API 합성 ASMR 엔진 (외부 mp3 없음)
   ────────────────────────────────────────────── */
let ctx = null
let master = null
const bufs = {}
const amb = {}
const layers = {}
let rainLevel = 1

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

function toOut(node, pan = 0, dest) {
  const d = dest || master
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
  for (const k of ['rain', 'stew', 'leaves']) {
    const out = ctx.createGain()
    out.gain.value = 0
    out.connect(master)
    amb[k] = { out, on: false, vol: 0.6, timer: null }
  }
  layers.rainA = loopLayer('pink', 'lowpass', 4200, 0.5, amb.rain.out)
  layers.rainB = loopLayer('white', 'highpass', 4500, 0.05, amb.rain.out)
  layers.rainC = loopLayer('brown', 'lowpass', 300, 0.15, amb.rain.out)
  loopLayer('brown', 'lowpass', 520, 0.7, amb.stew.out) // 보글보글 저음
  loopLayer('white', 'highpass', 4200, 0.022, amb.stew.out) // 지글지글
  loopLayer('pink', 'lowpass', 450, 0.12, amb.leaves.out) // 낙엽 사이 바람
  setRain(rainLevel)
}

const EVENTS = {
  rain: {
    fn: () => {
      const heavy = rainLevel >= 2
      tone({ freq: rnd(1400, 2600), to: rnd(700, 1000), dur: 0.05, peak: heavy ? 0.05 : 0.07, dest: amb.rain.out, pan: rnd(-0.8, 0.8) })
      if (Math.random() < 0.3) burst({ freq: rnd(3000, 6000), q: 1, dur: 0.03, peak: 0.08, dest: amb.rain.out, pan: rnd(-0.8, 0.8) })
    },
    ms: () => (rainLevel >= 2 ? rnd(110, 300) : rnd(260, 620)),
  },
  stew: {
    fn: () => {
      const pan = rnd(-0.4, 0.4)
      tone({ freq: rnd(180, 320), to: rnd(380, 620), dur: 0.09, peak: 0.13, dest: amb.stew.out, pan })
      burst({ freq: rnd(900, 1800), q: 1, dur: 0.04, peak: 0.12, dest: amb.stew.out, pan })
    },
    ms: () => rnd(90, 280),
  },
  leaves: {
    fn: () => {
      burst({ freq: rnd(3000, 6000), q: rnd(0.4, 1.2), dur: rnd(0.02, 0.05), peak: rnd(0.08, 0.25), dest: amb.leaves.out, pan: rnd(-0.6, 0.6) })
      if (Math.random() < 0.15) burst({ freq: rnd(1000, 2000), q: 0.6, dur: 0.1, peak: 0.1, dest: amb.leaves.out })
    },
    ms: () => rnd(60, 220),
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

export function setAmbient(name, on, vol) {
  if (!ctx || !amb[name]) return
  const a = amb[name]
  a.on = on
  a.vol = vol
  a.out.gain.setTargetAtTime(on ? vol : 0, ctx.currentTime, 0.12)
  if (on) startEvents(name)
}

export function setRain(level) {
  rainLevel = level
  if (!ctx || !layers.rainA) return
  const t = ctx.currentTime
  const heavy = level >= 2
  layers.rainA.f.frequency.setTargetAtTime(heavy ? 9000 : 4200, t, 0.3)
  layers.rainA.g.gain.setTargetAtTime(heavy ? 1 : 0.5, t, 0.3)
  layers.rainB.g.gain.setTargetAtTime(heavy ? 0.16 : 0.05, t, 0.3)
  layers.rainC.g.gain.setTargetAtTime(heavy ? 0.9 : 0.15, t, 0.3)
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
