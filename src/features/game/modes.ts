import { rt } from './runtime'
import { stepBall, stepBallPrediction } from './physics'
import { resetBall } from './state'
import { updateAI } from './ai'
import { drawFrame, drawTouchOverlay } from './rendering'
import { syncHostToRTDB, syncGuestToRTDB } from './online'
import { applyKeyboardPaddleLeft, applyKeyboardPaddleRight } from './input'
import { sfx } from '@/features/utils/audio'
import { WIN_SCORE } from './constants'
import { ref as dbRef } from 'firebase/database'
import { set } from '@/features/firebase/rtdb'
import { getFirebaseRTDB } from '@/features/firebase/setup'

// Callbacks injected by game.ts to avoid circular deps
let _goToMenu: () => void = () => {}
let _myDisplayName: () => string = () => 'Player'
let _saveResult: (winner: string, displayName: string, modeLabel: string) => Promise<void> = async () => {}

export function configureModes(opts: {
  goToMenu:      () => void
  myDisplayName: () => string
  saveResult:    (winner: string, displayName: string, modeLabel: string) => Promise<void>
}): void {
  _goToMenu      = opts.goToMenu
  _myDisplayName = opts.myDisplayName
  _saveResult    = opts.saveResult
}

// ── Canvas helpers ──
function getCtx():  CanvasRenderingContext2D { return (document.getElementById('c') as HTMLCanvasElement).getContext('2d')! }
function getOctx(): CanvasRenderingContext2D { return (document.getElementById('overlay') as HTMLCanvasElement).getContext('2d')! }
function getMsgEl(): HTMLElement              { return document.getElementById('message') as HTMLElement }

export function draw(): void {
  drawFrame(getCtx(), rt.state, {
    onlineRole:   rt.onlineRole,
    opponentName: rt.opponentName,
    mode:         rt.mode,
    displayName:  _myDisplayName(),
  })
}

export function updateOverlay(): void {
  drawTouchOverlay(getOctx(), rt.tp, rt.isTouch)
}

// ── Local game loop ──
function update(): void {
  applyKeyboardPaddleLeft()
  if (rt.mode === 'human') applyKeyboardPaddleRight()
  else updateAI(rt.state, rt.difficulty)

  const r = stepBall(rt.state)
  if (r.wallBounced)                       sfx.wallHit()
  if (r.leftPaddleHit || r.rightPaddleHit) sfx.paddleHit()

  if (r.goal === 'left')  { rt.state.right.score++; sfx.score(); checkLocalWin(rt.mode === 'cpu' ? 'Computer' : 'P2'); resetBall(rt.state,  1) }
  if (r.goal === 'right') { rt.state.left.score++;  sfx.score(); checkLocalWin('P1');                                  resetBall(rt.state, -1) }
}

export function loop(): void {
  update(); draw()
  if (rt.running) rt.animId = requestAnimationFrame(loop)
}

function checkLocalWin(winner: string): void {
  if (rt.state.left.score < WIN_SCORE && rt.state.right.score < WIN_SCORE) return
  rt.running = false; rt.lastWinner = winner; sfx.win()
  const name = winner === 'P1' ? _myDisplayName() : winner === 'P2' ? 'P2' : 'Computer'
  const msgEl = getMsgEl()
  msgEl.textContent = rt.isTouch ? `${name} wins! — Tap to play again` : `${name} wins! — Space to play again`
  _saveResult(winner, name, rt.mode === 'cpu' ? `vs CPU (${rt.difficulty})` : 'Local 2P')
}

// ── Host game loop ──
function hostUpdate(): void {
  applyKeyboardPaddleLeft()

  const r = stepBall(rt.state)
  if (r.wallBounced)                       sfx.wallHit()
  if (r.leftPaddleHit || r.rightPaddleHit) sfx.paddleHit()

  if (r.goal === 'left') {
    rt.state.right.score++; sfx.score()
    if (!checkOnlineWin()) {
      rt.running = false; resetBall(rt.state, 1); syncHostToRTDB()
      const rtdb = getFirebaseRTDB()
      if (rtdb && rt.onlineCode) set(dbRef(rtdb, `rooms/${rt.onlineCode}/resumeAt`), Date.now() + 3000)
      startCountdown(3)
    }
  }
  if (r.goal === 'right') {
    rt.state.left.score++; sfx.score()
    if (!checkOnlineWin()) {
      rt.running = false; resetBall(rt.state, -1); syncHostToRTDB()
      const rtdb = getFirebaseRTDB()
      if (rtdb && rt.onlineCode) set(dbRef(rtdb, `rooms/${rt.onlineCode}/resumeAt`), Date.now() + 3000)
      startCountdown(3)
    }
  }
}

export function hostLoop(): void {
  hostUpdate(); draw(); syncHostToRTDB()
  if (rt.running) rt.animId = requestAnimationFrame(hostLoop)
}

function checkOnlineWin(): boolean {
  if (rt.state.left.score < WIN_SCORE && rt.state.right.score < WIN_SCORE) return false
  rt.running = false
  const winner = rt.state.left.score >= WIN_SCORE ? rt.myName : rt.opponentName
  const rtdb = getFirebaseRTDB()
  if (rtdb && rt.onlineCode) set(dbRef(rtdb, `rooms/${rt.onlineCode}/winner`), winner)
  sfx.win()
  getMsgEl().textContent = `${winner} wins!`
  rt.lastWinner = winner
  _saveResult(winner, winner, 'Online')
  setTimeout(() => _goToMenu(), 3000)
  return true
}

// ── Guest game loop ──
function guestUpdate(): void {
  applyKeyboardPaddleRight()
  stepBallPrediction(rt.state)
}

export function guestLoop(): void {
  guestUpdate(); draw(); syncGuestToRTDB()
  if (rt.running) rt.animId = requestAnimationFrame(guestLoop)
}

// ── Countdown ──
export function startCountdown(n: number): void {
  cancelAnimationFrame(rt.countdownAnimId)
  rt.running = false
  const msgEl = getMsgEl()

  if (n > 0) {
    msgEl.textContent = String(n)
    sfx.click()
    function cdFrame(): void {
      if (rt.running) return
      if (rt.onlineRole === 'host') { applyKeyboardPaddleLeft(); syncHostToRTDB() }
      else                          { applyKeyboardPaddleRight(); syncGuestToRTDB() }
      draw()
      rt.countdownAnimId = requestAnimationFrame(cdFrame)
    }
    rt.countdownAnimId = requestAnimationFrame(cdFrame)
    setTimeout(() => startCountdown(n - 1), 1000)
  } else {
    msgEl.textContent = ''
    rt.running = true
    if (rt.onlineRole === 'host') hostLoop()
    else guestLoop()
  }
}

export { resetBall } from './state'
