import { rt } from '@/features/game/runtime'
import { W, H, PAD_H } from '@/features/game/constants'
import { configureModes, draw, updateOverlay, loop, hostLoop, guestLoop, startCountdown } from '@/features/game/modes'
import { setupTouchListeners, setupKeyboardListeners } from '@/features/game/input'
import {
  createRoom  as _createRoom,
  joinRoom    as _joinRoom,
  cancelRoom  as _cancelRoom,
  leaveRoom,
  setupRTDBListeners,
  syncHostToRTDB,
  syncGuestToRTDB,
} from '@/features/game/online'
import { sfx, toggleSound as audioToggleSound } from '@/features/utils/audio'
import { currentUser } from '@/features/firebase/auth'
import { saveEntry, getEntries, LeaderboardEntry } from '@/features/firebase/firestore'
import { set } from '@/features/firebase/rtdb'
import { ref as dbRef } from 'firebase/database'
import { getFirebaseRTDB } from '@/features/firebase/setup'
import { screenManager } from '@/features/ui/state/screenManager'
import { ScreenName } from '@/features/ui/state/types'
import { uiState } from '@/features/ui/state/uiState'
import type { GameMode, Difficulty } from '@/features/game/state'

// ── DOM refs ───────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('c') as HTMLCanvasElement
const msg      = document.getElementById('message') as HTMLElement
const info     = document.getElementById('info') as HTMLElement
const btnPause = document.getElementById('btn-pause') as HTMLButtonElement
const btnSound = document.getElementById('btn-sound') as HTMLButtonElement

// ── Helpers ────────────────────────────────────────────────────────────────────
function myDisplayName(): string {
  return currentUser?.displayName
    || localStorage.getItem('pong_guest_name')?.trim()
    || 'Player'
}

export function saveGuestName(val: string): void {
  const trimmed = val.trim()
  if (trimmed) localStorage.setItem('pong_guest_name', trimmed)
  else         localStorage.removeItem('pong_guest_name')
}

export function showNameSaved(): void {
  uiState.showSuccess('Name saved!')
}

// ── Screens ────────────────────────────────────────────────────────────────────
function showGameCanvas(): void {
  const uiRoot = document.getElementById('ui-root')
  const gameEl = document.getElementById('game')
  if (uiRoot) uiRoot.style.display = 'none'
  if (gameEl) gameEl.classList.add('visible')
}

// These are no-ops now — navigation is handled by ui/index.ts via screenManager
export function showMenu(): void { sfx.click() }
export async function showLeaderboard(): Promise<void> { sfx.click() }

// ── Responsive ─────────────────────────────────────────────────────────────────
export function resizeGame(): void {
  const scale     = Math.min(window.innerWidth / 816, window.innerHeight / 576, 1)
  const gameWrap  = document.getElementById('game-wrap') as HTMLElement
  gameWrap.style.transform = `translate(-50%, -50%) scale(${scale})`
  const portraitHint = document.getElementById('portrait-hint') as HTMLElement
  portraitHint.style.display =
    (rt.isTouch && window.innerWidth < window.innerHeight && window.innerWidth < 600) ? 'block' : 'none'
}

window.addEventListener('resize', resizeGame)
window.addEventListener('orientationchange', () => setTimeout(resizeGame, 150))

// ── Touch ──────────────────────────────────────────────────────────────────────
function onTouchStartGame(_e: TouchEvent): void {
  if (!document.getElementById('game')!.classList.contains('visible')) return
  if (!rt.running) {
    if (rt.onlineRole) {
      if (rt.lastWinner === null && !rt.myReady) {
        rt.myReady = true
        const rtdb = getFirebaseRTDB()
        if (rtdb && rt.onlineCode) {
          const readyPath = rt.onlineRole === 'host' ? 'ready/host' : 'ready/guest'
          set(dbRef(rtdb, `rooms/${rt.onlineCode}/${readyPath}`), true)
        }
        msg.textContent = 'Ready! Waiting for opponent…'
      }
    } else {
      rt.lastWinner !== null ? playAgain() : beginRunning()
    }
  }
  updateOverlay()
}

function onTouchMoveGame(): void {
  updateOverlay()
}

// ── Menu ───────────────────────────────────────────────────────────────────────
export function selectMode(m: string): void {
  sfx.click()
  rt.mode = m as GameMode
  if (m === 'online') {
    screenManager.navigate(ScreenName.ONLINE_LOBBY, { selectedMode: 'online' })
  } else {
    screenManager.navigate(ScreenName.DIFFICULTY_SELECTION, { selectedMode: m as 'cpu' | 'human' })
  }
}

export function selectDiff(d: string): void {
  sfx.click()
  rt.difficulty = d as Difficulty
  startGame()
}

// ── Online lobby UI ────────────────────────────────────────────────────────────
export function showOlChoice(): void {
  screenManager.navigate(ScreenName.ONLINE_LOBBY)
}

export function showJoinForm(): void {
  sfx.click()
  screenManager.navigate(ScreenName.ONLINE_LOBBY, { showJoin: true })
}

function showOlWaiting(code: string): void {
  // Update code display if element exists in current DOM (rendered by onlineLobby screen)
  const codeEl = document.getElementById('ol-code-display')
  if (codeEl) codeEl.textContent = code
  // Re-render online lobby in waiting state
  screenManager.navigate(ScreenName.ONLINE_LOBBY, { selectedMode: 'online' })
}

// ── Online room management ─────────────────────────────────────────────────────
export async function createRoom(): Promise<void> {
  sfx.click()
  await _createRoom(myDisplayName, (guestName) => {
    ;(document.getElementById('ol-status') as HTMLElement).textContent = `${guestName} joined!`
    const rtdb = getFirebaseRTDB()
    if (rtdb && rt.onlineCode) {
      set(dbRef(rtdb, `rooms/${rt.onlineCode}/status`), 'playing')
    }
    launchOnlineGame()
  })
  if (rt.onlineCode) showOlWaiting(rt.onlineCode)
}

export async function joinRoom(): Promise<void> {
  sfx.click()
  await _joinRoom(myDisplayName, () => launchOnlineGame())
}

export async function cancelRoom(): Promise<void> {
  sfx.click()
  await _cancelRoom()
  screenManager.navigate(ScreenName.ONLINE_LOBBY)
}

// ── Launch online game ─────────────────────────────────────────────────────────
function launchOnlineGame(): void {
  showGameCanvas()
  resizeGame()
  rt.state.left.score  = rt.state.right.score = 0
  rt.state.left.y = rt.state.right.y = H / 2 - PAD_H / 2
  rt.state.ball.x = W / 2; rt.state.ball.y = H / 2; rt.state.ball.vx = 4; rt.state.ball.vy = 3
  rt.lastWinner = null
  rt.myReady    = false
  rt.tp.left = rt.tp.right = null
  btnPause.style.display = 'none'

  ;(document.getElementById('online-badge') as HTMLElement).textContent = `🔴 ${rt.onlineCode}`
  msg.textContent = rt.isTouch ? '👆 Tap to ready!' : 'Press SPACE when ready!'
  info.textContent = rt.isTouch
    ? (rt.onlineRole === 'host' ? 'Drag left side — your paddle' : 'Drag right side — your paddle')
    : (rt.onlineRole === 'host' ? 'W/S — paddle  |  Space — ready  |  Esc — leave'
                                : '↑/↓ — paddle  |  Space — ready  |  Esc — leave')

  setupRTDBListeners({
    startCountdown,
    opponentDisconnected,
    onWin: (winner) => {
      setTimeout(() => goToMenu(), 3000)
    },
  })

  const rtdb = getFirebaseRTDB()
  if (rt.onlineRole === 'host' && rtdb && rt.onlineCode) {
    set(dbRef(rtdb, `rooms/${rt.onlineCode}/ready`), { host: false, guest: false })
    import('firebase/database').then(({ remove }) => {
      const rtdb2 = getFirebaseRTDB()
      if (rtdb2 && rt.onlineCode) remove(dbRef(rtdb2, `rooms/${rt.onlineCode}/resumeAt`))
    })
  }
  draw()
}

function opponentDisconnected(): void {
  rt.running = false
  cancelAnimationFrame(rt.animId)
  msg.textContent = 'Opponent disconnected'
  setTimeout(() => goToMenu(), 2500)
}

// ── Local game flow ────────────────────────────────────────────────────────────
export function startGame(): void {
  sfx.click()
  showGameCanvas()
  resizeGame()
  rt.state.left.score = rt.state.right.score = 0
  rt.lastWinner = null
  rt.tp.left = rt.tp.right = null
  rt.state.ball.x = W / 2; rt.state.ball.y = H / 2; rt.state.ball.vx = 4; rt.state.ball.vy = 3
  rt.state.left.y = rt.state.right.y = H / 2 - PAD_H / 2
  rt.state.aiTarget = H / 2
  btnPause.style.display = ''
  ;(document.getElementById('online-badge') as HTMLElement).textContent = ''
  updateInfo()
  msg.textContent = rt.isTouch ? 'Tap to Start' : 'Press Space to Start'
  btnPause.textContent = 'Pause'
  draw()
}

export function goToMenu(): void {
  rt.running = false
  cancelAnimationFrame(rt.animId)
  if (rt.onlineRole) leaveRoom()
  btnPause.style.display = ''
  screenManager.navigate(ScreenName.MAIN_MENU)
}

function beginRunning(): void {
  if (rt.running) return
  rt.running = true; msg.textContent = ''; btnPause.textContent = 'Pause'
  sfx.resume(); loop()
}

export function togglePause(): void {
  if (rt.lastWinner !== null || rt.onlineRole) return
  rt.running = !rt.running
  if (rt.running) {
    msg.textContent = ''; btnPause.textContent = 'Pause'; sfx.resume(); loop()
  } else {
    cancelAnimationFrame(rt.animId)
    msg.textContent = rt.isTouch ? 'Tap to Resume' : 'Paused — Space to Resume'
    btnPause.textContent = 'Resume'; sfx.pause()
  }
}

function playAgain(): void {
  rt.state.left.score = rt.state.right.score = 0; rt.lastWinner = null
  rt.state.ball.x = W / 2; rt.state.ball.y = H / 2; rt.state.ball.vx = 4; rt.state.ball.vy = 3
  rt.state.aiTarget = H / 2
  msg.textContent = ''; btnPause.textContent = 'Pause'
  rt.running = true; sfx.resume(); loop()
}

// ── Keyboard ───────────────────────────────────────────────────────────────────
function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') { goToMenu(); return }
  if (!document.getElementById('game')!.classList.contains('visible')) return
  if (e.key === ' ') {
    e.preventDefault()
    if (rt.onlineRole) {
      if (!rt.running && rt.lastWinner === null && !rt.myReady) {
        rt.myReady = true
        const rtdb = getFirebaseRTDB()
        if (rtdb && rt.onlineCode) {
          const readyPath = rt.onlineRole === 'host' ? 'ready/host' : 'ready/guest'
          set(dbRef(rtdb, `rooms/${rt.onlineCode}/${readyPath}`), true)
        }
        msg.textContent = 'Ready! Waiting for opponent…'
      }
    } else {
      if (rt.lastWinner !== null) playAgain()
      else if (!rt.running)       beginRunning()
      else                        togglePause()
    }
  }
}

function updateInfo(): void {
  if (rt.onlineRole) return
  info.textContent = rt.isTouch
    ? (rt.mode === 'human' ? 'Drag left — P1  |  Drag right — P2' : 'Drag left to move your paddle')
    : (rt.mode === 'human' ? 'W/S — P1  |  ↑/↓ — P2  |  Space — Pause  |  Esc — Menu'
                           : 'W/S — paddle  |  Space — Pause  |  Esc — Menu')
}

// ── Leaderboard ────────────────────────────────────────────────────────────────
const LB_KEY = 'pong_leaderboard'
const loadLB = (): LeaderboardEntry[] => {
  try { return JSON.parse(localStorage.getItem(LB_KEY) || '[]') as LeaderboardEntry[] } catch { return [] }
}
const saveLB = (d: LeaderboardEntry[]) => localStorage.setItem(LB_KEY, JSON.stringify(d))

async function saveResult(winner: string, displayName: string, modeLabel: string): Promise<void> {
  const entry: LeaderboardEntry = {
    winner:   displayName || winner,
    mode:     modeLabel,
    score:    `${rt.state.left.score}–${rt.state.right.score}`,
    date:     new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' } as Intl.DateTimeFormatOptions),
  }
  const lb = loadLB(); lb.unshift(entry); saveLB(lb.slice(0, 20))
  try { await saveEntry(entry, myDisplayName()) } catch (e) { console.warn('Firestore:', e) }
}

export function clearLocalScores(): void {
  if (!confirm('Clear local scores?')) return
  saveLB([])
  uiState.showSuccess('Local scores cleared')
  // Re-navigate to leaderboard so it refreshes
  screenManager.navigate(ScreenName.LEADERBOARD)
}

// ── Init ───────────────────────────────────────────────────────────────────────
export function initGame(): void {
  rt.isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches || ('ontouchstart' in window)

  configureModes({ goToMenu, myDisplayName, saveResult })
  setupTouchListeners(canvas, onTouchStartGame, onTouchMoveGame)
  setupKeyboardListeners(onKeyDown)

  // Set default mode/difficulty on runtime directly (UI is managed by screenManager)
  rt.mode = 'cpu'
  rt.difficulty = 'medium'
  resizeGame()
}

// Re-export toggleSound
export function toggleSound(): void { audioToggleSound(btnSound) }
