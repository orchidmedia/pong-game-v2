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
  const el = document.getElementById('name-saved') as HTMLElement
  el.style.opacity = '1'
  setTimeout(() => { el.style.opacity = '0' }, 1500)
}

// ── Screens ────────────────────────────────────────────────────────────────────
function showScreen(id: string): void {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('visible'))
  document.getElementById('game')!.classList.remove('visible')
  if (id === 'game') document.getElementById('game')!.classList.add('visible')
  else               document.getElementById(id)!.classList.add('visible')
}

export function showMenu(): void { sfx.click(); showScreen('menu') }
export async function showLeaderboard(): Promise<void> { sfx.click(); showScreen('leaderboard'); await renderLeaderboard() }

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

  const btnCpu    = document.getElementById('btn-vs-cpu')   as HTMLButtonElement
  const btnHuman  = document.getElementById('btn-vs-human') as HTMLButtonElement
  const btnOnline = document.getElementById('btn-online')   as HTMLButtonElement
  btnCpu.classList.toggle('active',    m === 'cpu')
  btnHuman.classList.toggle('active',  m === 'human')
  btnOnline.classList.toggle('active', m === 'online')

  const cpu       = m === 'cpu'
  const diffLabel = document.getElementById('diff-label') as HTMLElement
  const diffGroup = document.getElementById('diff-group') as HTMLElement
  diffLabel.style.opacity       = cpu ? '0.5'  : '0.15'
  diffGroup.style.opacity       = cpu ? '1'    : '0.25'
  diffGroup.style.pointerEvents = cpu ? 'auto' : 'none'

  const isOnline    = m === 'online'
  const btnStart    = document.getElementById('btn-start')     as HTMLButtonElement
  const onlinePanel = document.getElementById('online-panel')  as HTMLElement
  btnStart.style.display    = isOnline ? 'none' : ''
  onlinePanel.style.display = isOnline ? 'flex' : 'none'
  if (isOnline) showOlChoice()
}

export function selectDiff(d: string): void {
  sfx.click()
  rt.difficulty = d as Difficulty
  ;['easy', 'medium', 'hard'].forEach(x =>
    (document.getElementById('btn-' + x) as HTMLButtonElement).classList.toggle('active', x === d)
  )
}

// ── Online lobby UI ────────────────────────────────────────────────────────────
export function showOlChoice(): void {
  ;(document.getElementById('ol-choice')    as HTMLElement).style.display = 'flex'
  ;(document.getElementById('ol-waiting')   as HTMLElement).style.display = 'none'
  ;(document.getElementById('ol-join-form') as HTMLElement).style.display = 'none'
}

export function showJoinForm(): void {
  sfx.click()
  ;(document.getElementById('ol-choice')    as HTMLElement).style.display = 'none'
  const joinForm = document.getElementById('ol-join-form') as HTMLElement
  joinForm.style.display       = 'flex'
  joinForm.style.flexDirection = 'column'
  joinForm.style.alignItems    = 'center'
  ;(document.getElementById('ol-code-input') as HTMLInputElement).value = ''
  ;(document.getElementById('ol-code-input') as HTMLInputElement).focus()
}

function showOlWaiting(code: string): void {
  ;(document.getElementById('ol-choice')    as HTMLElement).style.display = 'none'
  ;(document.getElementById('ol-join-form') as HTMLElement).style.display = 'none'
  const waiting = document.getElementById('ol-waiting') as HTMLElement
  waiting.style.display       = 'flex'
  waiting.style.flexDirection = 'column'
  waiting.style.alignItems    = 'center'
  ;(document.getElementById('ol-code-display') as HTMLElement).textContent = code
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
  showOlChoice()
}

// ── Launch online game ─────────────────────────────────────────────────────────
function launchOnlineGame(): void {
  showScreen('game')
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
  showScreen('game')
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
  showMenu()
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

async function renderLeaderboard(): Promise<void> {
  const body  = document.getElementById('lb-body')   as HTMLElement
  const empty = document.getElementById('lb-empty')  as HTMLElement
  const src   = document.getElementById('lb-source') as HTMLElement
  body.innerHTML = `<tr><td colspan="5" style="opacity:0.3;text-align:center;padding:16px">Loading…</td></tr>`

  let lb: LeaderboardEntry[]
  let online = false
  try { lb = await getEntries(); online = true } catch { lb = loadLB() }

  src.textContent = online ? '🌐 Online leaderboard' : '💾 Local scores only'
  body.innerHTML  = ''
  empty.style.display = lb.length ? 'none' : 'block'
  lb.forEach((e, i) => {
    const tr = document.createElement('tr')
    if (i === 0) tr.classList.add('gold')
    if (i === 1) tr.classList.add('silver')
    if (i === 2) tr.classList.add('bronze')
    tr.innerHTML = `<td>${i + 1}</td><td>${e.winner || e.displayName || '—'}</td><td>${e.mode}</td><td>${e.score}</td><td>${e.date}</td>`
    body.appendChild(tr)
  })
}

export function clearLocalScores(): void {
  if (!confirm('Clear local scores?')) return
  saveLB([]); renderLeaderboard()
}

// ── Init ───────────────────────────────────────────────────────────────────────
export function initGame(): void {
  rt.isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches || ('ontouchstart' in window)

  configureModes({ goToMenu, myDisplayName, saveResult })
  setupTouchListeners(canvas, onTouchStartGame, onTouchMoveGame)
  setupKeyboardListeners(onKeyDown)

  selectMode('cpu')
  selectDiff('medium')
  resizeGame()

  const savedName = localStorage.getItem('pong_guest_name')
  if (savedName) (document.getElementById('guest-name-input') as HTMLInputElement).value = savedName
}

// Re-export toggleSound
export function toggleSound(): void { audioToggleSound(btnSound) }
