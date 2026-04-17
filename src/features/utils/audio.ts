let audioCtx: AudioContext | null = null
export let soundEnabled = true

function getAC(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

;['touchstart', 'mousedown', 'keydown'].forEach(ev =>
  document.addEventListener(ev, () => audioCtx?.resume(), { passive: true })
)

interface BeepOpts {
  freq?: number; dur?: number; vol?: number
  type?: OscillatorType; slide?: number | null
}

function beep({ freq = 440, dur = 0.08, vol = 0.3, type = 'square' as OscillatorType, slide = null }: BeepOpts): void {
  if (!soundEnabled) return
  try {
    const ac = getAC()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain); gain.connect(ac.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ac.currentTime)
    if (slide !== null) osc.frequency.linearRampToValueAtTime(slide, ac.currentTime + dur)
    gain.gain.setValueAtTime(vol, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur)
    osc.start(ac.currentTime); osc.stop(ac.currentTime + dur + 0.01)
  } catch (_) {}
}

const after = (ms: number, fn: () => void) => setTimeout(fn, ms)

export const sfx = {
  paddleHit: () => beep({ freq: 240, dur: 0.05, vol: 0.45 }),
  wallHit:   () => beep({ freq: 480, dur: 0.03, vol: 0.3  }),
  score:     () => { beep({ freq: 392, dur: 0.08, vol: 0.4 }); after(90, () => beep({ freq: 330, dur: 0.08, vol: 0.4 })); after(180, () => beep({ freq: 262, dur: 0.16, vol: 0.5 })) },
  win:       () => { [523, 659, 784, 1047].forEach((f, i) => after(i * 130, () => beep({ freq: f, dur: 0.2, vol: 0.45 }))) },
  click:     () => beep({ freq: 660, dur: 0.04, vol: 0.2  }),
  pause:     () => beep({ freq: 330, dur: 0.08, vol: 0.25, slide: 220 }),
  resume:    () => beep({ freq: 220, dur: 0.08, vol: 0.25, slide: 330 }),
}

export function toggleSound(btnEl: HTMLButtonElement): void {
  soundEnabled = !soundEnabled
  btnEl.innerHTML = soundEnabled
    ? `<svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="7" width="4" height="6"/><polygon points="5,7 11,2 11,18 5,13"/><path d="M13 6.5 Q16.5 10 13 13.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/><path d="M15.5 4 Q20.5 10 15.5 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>`
    : `<svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="7" width="4" height="6"/><polygon points="5,7 11,2 11,18 5,13"/><line x1="13" y1="7" x2="19" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="square"/><line x1="19" y1="7" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>`
  if (soundEnabled) sfx.click()
}
