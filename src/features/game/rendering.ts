import { W, H, PAD_W, PAD_H, BALL_R } from './constants'
import type { GameState, OnlineRole, GameMode } from './state'

export interface DrawOptions {
  onlineRole:   OnlineRole | null
  opponentName: string
  mode:         GameMode
  displayName:  string
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  opts: DrawOptions,
): void {
  ctx.clearRect(0, 0, W, H)

  ctx.setLineDash([10, 10])
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = '#fff'
  ctx.fillRect(20, state.left.y, PAD_W, PAD_H)
  ctx.fillRect(W - 20 - PAD_W, state.right.y, PAD_W, PAD_H)
  ctx.beginPath(); ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, Math.PI * 2); ctx.fill()

  ctx.font = 'bold 48px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fillText(String(state.left.score),  W / 4,     60)
  ctx.fillText(String(state.right.score), W * 3 / 4, 60)

  ctx.font = '12px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  if (opts.onlineRole) {
    const leftLabel  = opts.onlineRole === 'host' ? 'You' : opts.opponentName
    const rightLabel = opts.onlineRole === 'host' ? opts.opponentName : 'You'
    ctx.fillText(leftLabel,  W / 4,     80)
    ctx.fillText(rightLabel, W * 3 / 4, 80)
  } else {
    ctx.fillText(opts.displayName,                    W / 4,     80)
    ctx.fillText(opts.mode === 'cpu' ? 'CPU' : 'P2', W * 3 / 4, 80)
  }
}

export function drawTouchOverlay(
  octx: CanvasRenderingContext2D,
  tp: { left: number | null; right: number | null },
  isTouch: boolean,
): void {
  octx.clearRect(0, 0, W, H)
  if (!isTouch) return
  if (tp.left  !== null) { octx.fillStyle = 'rgba(255,255,255,0.05)'; octx.fillRect(0,     0, W / 2, H) }
  if (tp.right !== null) { octx.fillStyle = 'rgba(255,255,255,0.05)'; octx.fillRect(W / 2, 0, W / 2, H) }
}
