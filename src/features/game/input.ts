import { W, H, PAD_H } from './constants'
import { clamp } from './physics'
import { rt } from './runtime'

export function applyKeyboardPaddleLeft(): void {
  const SPD = 6
  if (rt.tp.left !== null) {
    rt.state.left.y = clamp(rt.tp.left - PAD_H / 2, 0, H - PAD_H)
  } else {
    if (rt.keys['w'] || rt.keys['W']) rt.state.left.y = clamp(rt.state.left.y - SPD, 0, H - PAD_H)
    if (rt.keys['s'] || rt.keys['S']) rt.state.left.y = clamp(rt.state.left.y + SPD, 0, H - PAD_H)
  }
}

export function applyKeyboardPaddleRight(): void {
  const SPD = 6
  if (rt.tp.right !== null) {
    rt.state.right.y = clamp(rt.tp.right - PAD_H / 2, 0, H - PAD_H)
  } else {
    if (rt.keys['ArrowUp'])   rt.state.right.y = clamp(rt.state.right.y - SPD, 0, H - PAD_H)
    if (rt.keys['ArrowDown']) rt.state.right.y = clamp(rt.state.right.y + SPD, 0, H - PAD_H)
  }
}

export function setupTouchListeners(
  canvas: HTMLCanvasElement,
  onTouchStart: (e: TouchEvent) => void,
  onTouchMove: (e: TouchEvent) => void,
): void {
  function handler(e: TouchEvent): void {
    e.preventDefault()
    rt.isTouch = true
    rt.tp.left = rt.tp.right = null
    const rect = canvas.getBoundingClientRect()
    for (const t of e.touches) {
      const cx = (t.clientX - rect.left) / rect.width  * W
      const cy = (t.clientY - rect.top)  / rect.height * H
      if (cx < W / 2) rt.tp.left = cy; else rt.tp.right = cy
    }
    if (e.type === 'touchstart') onTouchStart(e)
    else onTouchMove(e)
  }
  canvas.addEventListener('touchstart',  handler, { passive: false })
  canvas.addEventListener('touchmove',   handler, { passive: false })
  canvas.addEventListener('touchend',    handler, { passive: false })
  canvas.addEventListener('touchcancel', handler, { passive: false })
}

export function setupKeyboardListeners(onKeyDown: (e: KeyboardEvent) => void): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => { rt.keys[e.key] = true; onKeyDown(e) })
  document.addEventListener('keyup',   (e: KeyboardEvent) => { rt.keys[e.key] = false })
}
