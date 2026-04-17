import { W, H, PAD_W, PAD_H, AI_SPEED, AI_ERROR } from './constants'
import type { GameState, Difficulty } from './state'
import { clamp } from './physics'

export function updateAI(state: GameState, difficulty: Difficulty): void {
  const b = state.ball
  const spd = AI_SPEED[difficulty]
  const err = AI_ERROR[difficulty]

  if (b.vx > 0) {
    const t = (W - 20 - PAD_W - b.x) / b.vx
    let py = (b.y + b.vy * t) % (H * 2)
    if (py < 0) py += H * 2
    if (py > H) py = H * 2 - py
    state.aiTarget = py + (Math.random() * 2 - 1) * err
  }
  const center = state.right.y + PAD_H / 2
  if      (center < state.aiTarget - 4) state.right.y += spd
  else if (center > state.aiTarget + 4) state.right.y -= spd
  state.right.y = clamp(state.right.y, 0, H - PAD_H)
}
