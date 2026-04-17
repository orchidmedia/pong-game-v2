import { W, H, PAD_W, PAD_H, BALL_R, SPEED_INC } from './constants'
import type { GameState } from './state'

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v))

export interface StepResult {
  wallBounced:    boolean
  leftPaddleHit:  boolean
  rightPaddleHit: boolean
  goal:           'left' | 'right' | null
}

export function stepBall(state: GameState): StepResult {
  const b = state.ball
  const result: StepResult = { wallBounced: false, leftPaddleHit: false, rightPaddleHit: false, goal: null }

  b.x += b.vx; b.y += b.vy

  if (b.y <= BALL_R)     { b.y = BALL_R;     b.vy *= -1; result.wallBounced = true }
  if (b.y >= H - BALL_R) { b.y = H - BALL_R; b.vy *= -1; result.wallBounced = true }

  const lp = state.left
  if (b.x - BALL_R <= PAD_W + 20 && b.x - BALL_R >= 20 && b.y >= lp.y && b.y <= lp.y + PAD_H) {
    b.x = PAD_W + 20 + BALL_R
    b.vx = Math.abs(b.vx) + SPEED_INC
    b.vy += ((b.y - (lp.y + PAD_H / 2)) / (PAD_H / 2)) * 2
    result.leftPaddleHit = true
  }

  const rp = state.right
  if (b.x + BALL_R >= W - PAD_W - 20 && b.x + BALL_R <= W - 20 && b.y >= rp.y && b.y <= rp.y + PAD_H) {
    b.x = W - PAD_W - 20 - BALL_R
    b.vx = -(Math.abs(b.vx) + SPEED_INC)
    b.vy += ((b.y - (rp.y + PAD_H / 2)) / (PAD_H / 2)) * 2
    result.rightPaddleHit = true
  }

  b.vy = clamp(b.vy, -10, 10)

  if (b.x < 0) result.goal = 'left'
  if (b.x > W) result.goal = 'right'

  return result
}

// Guest-side local prediction — no sfx, no scoring, just movement + wall bounce
export function stepBallPrediction(state: GameState): void {
  const b = state.ball
  b.x += b.vx; b.y += b.vy
  if (b.y <= BALL_R)     { b.y = BALL_R;     b.vy = Math.abs(b.vy) }
  if (b.y >= H - BALL_R) { b.y = H - BALL_R; b.vy = -Math.abs(b.vy) }
  b.vy = clamp(b.vy, -10, 10)
}

export { resetBall } from './state'
