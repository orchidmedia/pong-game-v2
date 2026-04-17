import { W, H, PAD_W, PAD_H, BALL_R, SPEED_INC, WIN_SCORE, AI_SPEED, AI_ERROR } from '@/features/game/constants'
import { GameState, Difficulty, GameMode, OnlineRole } from '@/features/game/state'
import { sfx, toggleSound as audioToggleSound } from '@/features/utils/audio'
import { currentUser } from '@/features/firebase/auth'
import { saveEntry, getEntries, LeaderboardEntry } from '@/features/firebase/firestore'
import {
  getRoomRef, set, get, update as rtdbUpdate, onValue, remove, onDisconnect,
  DatabaseReference
} from '@/features/firebase/rtdb'
import { ref as dbRef } from 'firebase/database'
import { getFirebaseRTDB } from '@/features/firebase/setup'

// ── DOM refs ──────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('c') as HTMLCanvasElement
const ctx      = canvas.getContext('2d')!
const overlay  = document.getElementById('overlay') as HTMLCanvasElement
const octx     = overlay.getContext('2d')!
const msg      = document.getElementById('message') as HTMLElement
const info     = document.getElementById('info') as HTMLElement
const btnPause = document.getElementById('btn-pause') as HTMLButtonElement
const btnSound = document.getElementById('btn-sound') as HTMLButtonElement

// ── State ──────────────────────────────────────────────────────────────────────
let mode: GameMode = 'cpu'
let difficulty: Difficulty = 'medium'
let running = false
let animId = 0
let lastWinner: string | null = null
let isTouch = false

const state: GameState = {
  left:     { y: H / 2 - PAD_H / 2, score: 0 },
  right:    { y: H / 2 - PAD_H / 2, score: 0 },
  ball:     { x: W / 2, y: H / 2, vx: 4, vy: 3 },
  aiTarget: H / 2,
}
const tp: { left: number | null; right: number | null } = { left: null, right: null }

// ── Online multiplayer state ───────────────────────────────────────────────────
let onlineRole: OnlineRole | null = null
let onlineCode: string | null = null
let roomRef: DatabaseReference | null = null
let myName = ''
let opponentName = ''
let onlineSubs: Array<() => void> = []
let lastSyncAt = 0
let myReady = false
let countdownAnimId = 0

// ── Helpers ───────────────────────────────────────────────────────────────────
function myDisplayName(): string {
  return currentUser?.displayName
    || localStorage.getItem('pong_guest_name')?.trim()
    || 'Player'
}

export function saveGuestName(val: string): void {
  const trimmed = val.trim()
  if (trimmed) localStorage.setItem('pong_guest_name', trimmed)
  else localStorage.removeItem('pong_guest_name')
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
  const scale = Math.min(window.innerWidth / 816, window.innerHeight / 576, 1)
  const gameWrap = document.getElementById('game-wrap') as HTMLElement
  gameWrap.style.transform = `translate(-50%, -50%) scale(${scale})`
  const portraitHint = document.getElementById('portrait-hint') as HTMLElement
  portraitHint.style.display =
    (isTouch && window.innerWidth < window.innerHeight && window.innerWidth < 600) ? 'block' : 'none'
}

window.addEventListener('resize', resizeGame)
window.addEventListener('orientationchange', () => setTimeout(resizeGame, 150))

// ── Touch ──────────────────────────────────────────────────────────────────────
function detectTouch(): void {
  isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches || ('ontouchstart' in window)
}

canvas.addEventListener('touchstart',  onCanvasTouch, { passive: false })
canvas.addEventListener('touchmove',   onCanvasTouch, { passive: false })
canvas.addEventListener('touchend',    onCanvasTouch, { passive: false })
canvas.addEventListener('touchcancel', onCanvasTouch, { passive: false })

function onCanvasTouch(e: TouchEvent): void {
  e.preventDefault(); isTouch = true
  tp.left = tp.right = null
  const rect = canvas.getBoundingClientRect()
  for (const t of e.touches) {
    const cx = (t.clientX - rect.left) / rect.width  * W
    const cy = (t.clientY - rect.top)  / rect.height * H
    if (cx < W / 2) tp.left = cy; else tp.right = cy
  }
  if (e.type === 'touchstart' && !running && document.getElementById('game')!.classList.contains('visible')) {
    if (onlineRole) {
      if (lastWinner === null && !myReady) {
        myReady = true
        if (roomRef) {
          const readyPath = onlineRole === 'host' ? 'ready/host' : 'ready/guest'
          set(dbRef(getFirebaseRTDB()!, `rooms/${onlineCode}/${readyPath}`), true)
        }
        msg.textContent = 'Ready! Waiting for opponent…'
      }
      return
    }
    lastWinner !== null ? playAgain() : beginRunning()
  }
  updateOverlay()
}

// ── Menu ───────────────────────────────────────────────────────────────────────
export function selectMode(m: string): void {
  sfx.click()
  mode = m as GameMode

  const btnCpu   = document.getElementById('btn-vs-cpu') as HTMLButtonElement
  const btnHuman = document.getElementById('btn-vs-human') as HTMLButtonElement
  const btnOnline = document.getElementById('btn-online') as HTMLButtonElement
  btnCpu.classList.toggle('active',    m === 'cpu')
  btnHuman.classList.toggle('active',  m === 'human')
  btnOnline.classList.toggle('active', m === 'online')

  const cpu = m === 'cpu'
  const diffLabel = document.getElementById('diff-label') as HTMLElement
  const diffGroup = document.getElementById('diff-group') as HTMLElement
  diffLabel.style.opacity       = cpu ? '0.5'  : '0.15'
  diffGroup.style.opacity       = cpu ? '1'    : '0.25'
  diffGroup.style.pointerEvents = cpu ? 'auto' : 'none'

  const isOnline = m === 'online'
  const btnStart    = document.getElementById('btn-start') as HTMLButtonElement
  const onlinePanel = document.getElementById('online-panel') as HTMLElement
  btnStart.style.display    = isOnline ? 'none' : ''
  onlinePanel.style.display = isOnline ? 'flex' : 'none'
  if (isOnline) showOlChoice()
}

export function selectDiff(d: string): void {
  sfx.click()
  difficulty = d as Difficulty
  ;['easy', 'medium', 'hard'].forEach(x =>
    (document.getElementById('btn-' + x) as HTMLButtonElement).classList.toggle('active', x === d)
  )
}

// ── Online lobby UI helpers ────────────────────────────────────────────────────
export function showOlChoice(): void {
  ;(document.getElementById('ol-choice') as HTMLElement).style.display    = 'flex'
  ;(document.getElementById('ol-waiting') as HTMLElement).style.display   = 'none'
  ;(document.getElementById('ol-join-form') as HTMLElement).style.display = 'none'
}

export function showJoinForm(): void {
  sfx.click()
  ;(document.getElementById('ol-choice') as HTMLElement).style.display    = 'none'
  const joinForm = document.getElementById('ol-join-form') as HTMLElement
  joinForm.style.display       = 'flex'
  joinForm.style.flexDirection = 'column'
  joinForm.style.alignItems    = 'center'
  ;(document.getElementById('ol-code-input') as HTMLInputElement).value = ''
  ;(document.getElementById('ol-code-input') as HTMLInputElement).focus()
}

function showOlWaiting(code: string): void {
  ;(document.getElementById('ol-choice') as HTMLElement).style.display    = 'none'
  ;(document.getElementById('ol-join-form') as HTMLElement).style.display = 'none'
  const waiting = document.getElementById('ol-waiting') as HTMLElement
  waiting.style.display       = 'flex'
  waiting.style.flexDirection = 'column'
  waiting.style.alignItems    = 'center'
  ;(document.getElementById('ol-code-display') as HTMLElement).textContent = code
}

// ── Online room management ─────────────────────────────────────────────────────
function genCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase()
}

export async function createRoom(): Promise<void> {
  sfx.click()
  const rtdb = getFirebaseRTDB()
  if (!rtdb) { alert('Firebase not connected'); return }

  let code: string
  let ref: DatabaseReference
  // find an unused code
  do {
    code = genCode()
    ref  = dbRef(rtdb, `rooms/${code}`)
    const snap = await get(ref)
    if (!snap.exists()) break
  } while (true)

  myName     = myDisplayName()
  onlineCode = code
  onlineRole = 'host'
  roomRef    = ref

  await set(roomRef, {
    status: 'waiting',
    host:   { name: myName, paddleY: H / 2 - PAD_H / 2 },
    guest:  null,
    ball:   { x: W / 2, y: H / 2, vx: 4, vy: 3 },
    score:  { host: 0, guest: 0 },
  })

  // Auto-delete room when host disconnects
  onDisconnect(roomRef).remove()

  showOlWaiting(code)

  // Watch for guest joining
  const guestNameRef = dbRef(rtdb, `rooms/${code}/guest/name`)
  const unsub = onValue(guestNameRef, snap => {
    if (snap.val()) {
      opponentName = snap.val() as string
      ;(document.getElementById('ol-status') as HTMLElement).textContent = `${opponentName} joined!`
      set(dbRef(rtdb, `rooms/${code}/status`), 'playing')
      unsub() // detach this listener
      launchOnlineGame()
    }
  })
}

export async function joinRoom(): Promise<void> {
  sfx.click()
  const code = (document.getElementById('ol-code-input') as HTMLInputElement).value.toUpperCase().trim()
  if (code.length !== 4) { alert('Enter a 4-letter code'); return }
  const rtdb = getFirebaseRTDB()
  if (!rtdb) { alert('Firebase not connected'); return }

  const ref  = dbRef(rtdb, `rooms/${code}`)
  const snap = await get(ref)
  if (!snap.exists()) { alert('Room not found'); return }
  const data = snap.val() as Record<string, unknown>
  if (data.status !== 'waiting') { alert('Room is full or game already started'); return }

  const hostData = data.host as Record<string, unknown> | null
  myName       = myDisplayName()
  opponentName = (hostData?.name as string) || 'Host'
  onlineCode   = code
  onlineRole   = 'guest'
  roomRef      = ref

  await set(dbRef(rtdb, `rooms/${code}/guest`), { name: myName, paddleY: H / 2 - PAD_H / 2 })
  onDisconnect(dbRef(rtdb, `rooms/${code}/guest`)).remove()

  launchOnlineGame()
}

export async function cancelRoom(): Promise<void> {
  sfx.click()
  if (roomRef) { await remove(roomRef); roomRef = null }
  onlineRole = null; onlineCode = null
  showOlChoice()
}

function leaveRoom(): void {
  onlineSubs.forEach(u => u())
  onlineSubs = []
  cancelAnimationFrame(countdownAnimId)
  countdownAnimId = 0
  if (roomRef) {
    const rtdb = getFirebaseRTDB()
    if (rtdb && onlineCode) {
      if (onlineRole === 'host') remove(roomRef)
      else remove(dbRef(rtdb, `rooms/${onlineCode}/guest`))
    }
    roomRef = null
  }
  onlineRole = null; onlineCode = null
  myReady = false
}

// ── Launch online game ─────────────────────────────────────────────────────────
function launchOnlineGame(): void {
  showScreen('game')
  resizeGame()
  state.left.score = state.right.score = 0
  state.left.y = state.right.y = H / 2 - PAD_H / 2
  state.ball.x = W / 2; state.ball.y = H / 2; state.ball.vx = 4; state.ball.vy = 3
  lastWinner = null
  myReady = false
  tp.left = tp.right = null
  btnPause.style.display = 'none'

  ;(document.getElementById('online-badge') as HTMLElement).textContent = `🔴 ${onlineCode}`
  msg.textContent = isTouch ? '👆 Tap to ready!' : 'Press SPACE when ready!'
  info.textContent = isTouch
    ? (onlineRole === 'host' ? 'Drag left side — your paddle' : 'Drag right side — your paddle')
    : (onlineRole === 'host' ? 'W/S — paddle  |  Space — ready  |  Esc — leave'
                             : '↑/↓ — paddle  |  Space — ready  |  Esc — leave')

  setupRTDBListeners()

  // Host initialises ready flags in RTDB
  const rtdb = getFirebaseRTDB()
  if (onlineRole === 'host' && rtdb && onlineCode) {
    set(dbRef(rtdb, `rooms/${onlineCode}/ready`), { host: false, guest: false })
    remove(dbRef(rtdb, `rooms/${onlineCode}/resumeAt`))
  }
  draw()
}

// ── RTDB sync ──────────────────────────────────────────────────────────────────
function setupRTDBListeners(): void {
  const rtdb = getFirebaseRTDB()
  if (!rtdb || !onlineCode) return

  function sub(path: string, cb: (snap: ReturnType<typeof import('firebase/database').get> extends Promise<infer T> ? T : never) => void): void {
    const ref = dbRef(rtdb!, `rooms/${onlineCode}/${path}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsub = onValue(ref, cb as any)
    onlineSubs.push(unsub)
  }

  // ── Ready coordination (both players watch) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sub('ready', (snap: any) => {
    if (running || lastWinner !== null) return
    const r = snap.val() as { host: boolean; guest: boolean } | null
    if (!r) return
    if (r.host && r.guest) {
      if (onlineRole === 'host') {
        set(dbRef(rtdb!, `rooms/${onlineCode}/resumeAt`), Date.now() + 3000)
        startCountdown(3)
      }
      // Guest countdown triggered by resumeAt listener below
    } else {
      const myFlag = onlineRole === 'host' ? r.host : r.guest
      if (myFlag) msg.textContent = 'Waiting for opponent…'
    }
  })

  // ── Guest listens for countdown/round-resume signal from host ──
  if (onlineRole === 'guest') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('resumeAt', (snap: any) => {
      const t = snap.val() as number | null
      if (!t || running) return
      cancelAnimationFrame(animId)
      cancelAnimationFrame(countdownAnimId)
      running = false
      const secs = Math.min(3, Math.max(1, Math.round((t - Date.now()) / 1000)))
      startCountdown(secs)
    })
  }

  if (onlineRole === 'host') {
    // Host reads guest paddle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('guest/paddleY', (snap: any) => {
      if (snap.val() !== null) state.right.y = snap.val() as number
    })
    // Host watches for guest leaving
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('guest', (snap: any) => {
      if (running && snap.val() === null) opponentDisconnected()
    })

  } else {
    // Guest reads ball + host paddle + scores
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('ball', (snap: any) => {
      const b = snap.val() as { x: number; y: number; vx: number; vy: number } | null
      if (!b) return
      const dx = b.x - state.ball.x
      const dy = b.y - state.ball.y
      if (Math.abs(dx) > 60 || Math.abs(dy) > 60) {
        Object.assign(state.ball, b)
      } else {
        state.ball.vx = b.vx
        state.ball.vy = b.vy
        state.ball.x += dx * 0.35
        state.ball.y += dy * 0.35
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('host/paddleY', (snap: any) => {
      if (snap.val() !== null) state.left.y = snap.val() as number
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('score', (snap: any) => {
      const s = snap.val() as { host: number; guest: number } | null
      if (s) { state.left.score = s.host || 0; state.right.score = s.guest || 0 }
    })
    // Guest watches for win signal from host
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('winner', (snap: any) => {
      if (snap.val() && running) {
        running = false
        const winner = snap.val() as string
        sfx.win()
        msg.textContent = `${winner} wins!`
        lastWinner = winner
        setTimeout(() => goToMenu(), 3000)
      }
    })
    // Guest watches for host leaving
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('host', (snap: any) => {
      if (running && snap.val() === null) opponentDisconnected()
    })
  }
}

// ── Countdown ──────────────────────────────────────────────────────────────────
function startCountdown(n: number): void {
  cancelAnimationFrame(countdownAnimId)
  running = false

  if (n > 0) {
    msg.textContent = String(n)
    sfx.click()

    function cdFrame(): void {
      if (running) return
      const SPD = 6
      if (onlineRole === 'host') {
        if (tp.left !== null) state.left.y = clamp(tp.left - PAD_H / 2, 0, H - PAD_H)
        else {
          if (keys['w'] || keys['W']) state.left.y = clamp(state.left.y - SPD, 0, H - PAD_H)
          if (keys['s'] || keys['S']) state.left.y = clamp(state.left.y + SPD, 0, H - PAD_H)
        }
        syncHostToRTDB()
      } else {
        if (tp.right !== null) state.right.y = clamp(tp.right - PAD_H / 2, 0, H - PAD_H)
        else {
          if (keys['ArrowUp'])   state.right.y = clamp(state.right.y - SPD, 0, H - PAD_H)
          if (keys['ArrowDown']) state.right.y = clamp(state.right.y + SPD, 0, H - PAD_H)
        }
        syncGuestToRTDB()
      }
      draw()
      countdownAnimId = requestAnimationFrame(cdFrame)
    }
    countdownAnimId = requestAnimationFrame(cdFrame)
    setTimeout(() => startCountdown(n - 1), 1000)

  } else {
    msg.textContent = ''
    running = true
    if (onlineRole === 'host') hostLoop()
    else guestLoop()
  }
}

function syncHostToRTDB(): void {
  const now = Date.now()
  if (now - lastSyncAt < 16) return
  lastSyncAt = now
  const rtdb = getFirebaseRTDB()
  if (!rtdb || !onlineCode) return
  rtdbUpdate(dbRef(rtdb, `rooms/${onlineCode}`), {
    'ball/x':       state.ball.x,
    'ball/y':       state.ball.y,
    'ball/vx':      state.ball.vx,
    'ball/vy':      state.ball.vy,
    'host/paddleY': state.left.y,
    'score/host':   state.left.score,
    'score/guest':  state.right.score,
  })
}

function syncGuestToRTDB(): void {
  const now = Date.now()
  if (now - lastSyncAt < 16) return
  lastSyncAt = now
  const rtdb = getFirebaseRTDB()
  if (!rtdb || !onlineCode) return
  set(dbRef(rtdb, `rooms/${onlineCode}/guest/paddleY`), state.right.y)
}

function opponentDisconnected(): void {
  running = false
  cancelAnimationFrame(animId)
  msg.textContent = 'Opponent disconnected'
  setTimeout(() => goToMenu(), 2500)
}

// ── Host game loop ─────────────────────────────────────────────────────────────
function hostLoop(): void {
  hostUpdate()
  draw()
  syncHostToRTDB()
  if (running) animId = requestAnimationFrame(hostLoop)
}

function hostUpdate(): void {
  const SPD = 6
  if (tp.left !== null) {
    state.left.y = clamp(tp.left - PAD_H / 2, 0, H - PAD_H)
  } else {
    if (keys['w'] || keys['W']) state.left.y = clamp(state.left.y - SPD, 0, H - PAD_H)
    if (keys['s'] || keys['S']) state.left.y = clamp(state.left.y + SPD, 0, H - PAD_H)
  }

  const b = state.ball
  b.x += b.vx; b.y += b.vy

  if (b.y <= BALL_R)     { b.y = BALL_R;     b.vy *= -1; sfx.wallHit() }
  if (b.y >= H - BALL_R) { b.y = H - BALL_R; b.vy *= -1; sfx.wallHit() }

  const lp = state.left
  if (b.x - BALL_R <= PAD_W + 20 && b.x - BALL_R >= 20 && b.y >= lp.y && b.y <= lp.y + PAD_H) {
    b.x = PAD_W + 20 + BALL_R
    b.vx = Math.abs(b.vx) + SPEED_INC
    b.vy += ((b.y - (lp.y + PAD_H / 2)) / (PAD_H / 2)) * 2
    sfx.paddleHit()
  }
  const rp = state.right
  if (b.x + BALL_R >= W - PAD_W - 20 && b.x + BALL_R <= W - 20 && b.y >= rp.y && b.y <= rp.y + PAD_H) {
    b.x = W - PAD_W - 20 - BALL_R
    b.vx = -(Math.abs(b.vx) + SPEED_INC)
    b.vy += ((b.y - (rp.y + PAD_H / 2)) / (PAD_H / 2)) * 2
    sfx.paddleHit()
  }
  b.vy = clamp(b.vy, -10, 10)

  const rtdb = getFirebaseRTDB()
  if (b.x < 0) {
    state.right.score++; sfx.score()
    if (!checkOnlineWin()) {
      running = false; reset(1); syncHostToRTDB()
      if (rtdb && onlineCode) {
        set(dbRef(rtdb, `rooms/${onlineCode}/resumeAt`), Date.now() + 3000)
      }
      startCountdown(3)
    }
  }
  if (b.x > W) {
    state.left.score++; sfx.score()
    if (!checkOnlineWin()) {
      running = false; reset(-1); syncHostToRTDB()
      if (rtdb && onlineCode) {
        set(dbRef(rtdb, `rooms/${onlineCode}/resumeAt`), Date.now() + 3000)
      }
      startCountdown(3)
    }
  }
}

function checkOnlineWin(): boolean {
  if (state.left.score < WIN_SCORE && state.right.score < WIN_SCORE) return false
  running = false
  const winner = state.left.score >= WIN_SCORE ? myName : opponentName
  const rtdb = getFirebaseRTDB()
  if (rtdb && onlineCode) {
    set(dbRef(rtdb, `rooms/${onlineCode}/winner`), winner)
  }
  sfx.win()
  msg.textContent = `${winner} wins!`
  lastWinner = winner
  saveResult(winner, winner, 'Online')
  setTimeout(() => goToMenu(), 3000)
  return true
}

// ── Guest game loop ────────────────────────────────────────────────────────────
function guestLoop(): void {
  guestUpdate()
  draw()
  syncGuestToRTDB()
  if (running) animId = requestAnimationFrame(guestLoop)
}

function guestUpdate(): void {
  const SPD = 6
  if (tp.right !== null) {
    state.right.y = clamp(tp.right - PAD_H / 2, 0, H - PAD_H)
  } else {
    if (keys['ArrowUp'])   state.right.y = clamp(state.right.y - SPD, 0, H - PAD_H)
    if (keys['ArrowDown']) state.right.y = clamp(state.right.y + SPD, 0, H - PAD_H)
  }
  // Client-side ball prediction
  const b = state.ball
  b.x += b.vx; b.y += b.vy
  if (b.y <= BALL_R)     { b.y = BALL_R;     b.vy = Math.abs(b.vy) }
  if (b.y >= H - BALL_R) { b.y = H - BALL_R; b.vy = -Math.abs(b.vy) }
  b.vy = clamp(b.vy, -10, 10)
}

// ── Local game flow ────────────────────────────────────────────────────────────
export function startGame(): void {
  sfx.click()
  showScreen('game')
  resizeGame()
  state.left.score = state.right.score = 0
  lastWinner = null
  tp.left = tp.right = null
  reset(1)
  btnPause.style.display = ''
  ;(document.getElementById('online-badge') as HTMLElement).textContent = ''
  updateInfo()
  msg.textContent = isTouch ? 'Tap to Start' : 'Press Space to Start'
  btnPause.textContent = 'Pause'
  draw()
}

export function goToMenu(): void {
  running = false
  cancelAnimationFrame(animId)
  if (onlineRole) leaveRoom()
  btnPause.style.display = ''
  showMenu()
}

function beginRunning(): void {
  if (running) return
  running = true; msg.textContent = ''; btnPause.textContent = 'Pause'
  sfx.resume(); loop()
}

export function togglePause(): void {
  if (lastWinner !== null || onlineRole) return
  running = !running
  if (running) {
    msg.textContent = ''; btnPause.textContent = 'Pause'; sfx.resume(); loop()
  } else {
    cancelAnimationFrame(animId)
    msg.textContent = isTouch ? 'Tap to Resume' : 'Paused — Space to Resume'
    btnPause.textContent = 'Resume'; sfx.pause()
  }
}

function playAgain(): void {
  state.left.score = state.right.score = 0; lastWinner = null
  reset(1); msg.textContent = ''; btnPause.textContent = 'Pause'
  running = true; sfx.resume(); loop()
}

// ── Keyboard ───────────────────────────────────────────────────────────────────
const keys: Record<string, boolean> = {}
document.addEventListener('keydown', e => {
  keys[e.key] = true
  if (e.key === 'Escape') { goToMenu(); return }
  if (!document.getElementById('game')!.classList.contains('visible')) return
  if (e.key === ' ') {
    e.preventDefault()
    if (onlineRole) {
      if (!running && lastWinner === null && !myReady) {
        myReady = true
        const rtdb = getFirebaseRTDB()
        if (rtdb && onlineCode) {
          const readyPath = onlineRole === 'host' ? 'ready/host' : 'ready/guest'
          set(dbRef(rtdb, `rooms/${onlineCode}/${readyPath}`), true)
        }
        msg.textContent = 'Ready! Waiting for opponent…'
      }
    } else {
      if (lastWinner !== null) playAgain()
      else if (!running)       beginRunning()
      else                     togglePause()
    }
  }
})
document.addEventListener('keyup', e => { keys[e.key] = false })

// ── Local game helpers ─────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

function reset(dir: 1 | -1 = 1): void {
  state.ball.x = W / 2; state.ball.y = H / 2
  state.ball.vx = 4 * dir
  state.ball.vy = (Math.random() * 4 + 2) * (Math.random() < 0.5 ? 1 : -1)
  state.aiTarget = H / 2
}

function updateAI(): void {
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

function update(): void {
  const SPD = 6
  if (tp.left !== null) { state.left.y = clamp(tp.left - PAD_H / 2, 0, H - PAD_H) }
  else {
    if (keys['w'] || keys['W']) state.left.y = clamp(state.left.y - SPD, 0, H - PAD_H)
    if (keys['s'] || keys['S']) state.left.y = clamp(state.left.y + SPD, 0, H - PAD_H)
  }
  if (mode === 'human') {
    if (tp.right !== null) { state.right.y = clamp(tp.right - PAD_H / 2, 0, H - PAD_H) }
    else {
      if (keys['ArrowUp'])   state.right.y = clamp(state.right.y - SPD, 0, H - PAD_H)
      if (keys['ArrowDown']) state.right.y = clamp(state.right.y + SPD, 0, H - PAD_H)
    }
  } else { updateAI() }

  const b = state.ball
  b.x += b.vx; b.y += b.vy
  if (b.y <= BALL_R)   { b.y = BALL_R;     b.vy *= -1; sfx.wallHit() }
  if (b.y >= H - BALL_R) { b.y = H - BALL_R; b.vy *= -1; sfx.wallHit() }

  const lp = state.left
  if (b.x - BALL_R <= PAD_W + 20 && b.x - BALL_R >= 20 && b.y >= lp.y && b.y <= lp.y + PAD_H) {
    b.x = PAD_W + 20 + BALL_R; b.vx = Math.abs(b.vx) + SPEED_INC
    b.vy += ((b.y - (lp.y + PAD_H / 2)) / (PAD_H / 2)) * 2; sfx.paddleHit()
  }
  const rp = state.right
  if (b.x + BALL_R >= W - PAD_W - 20 && b.x + BALL_R <= W - 20 && b.y >= rp.y && b.y <= rp.y + PAD_H) {
    b.x = W - PAD_W - 20 - BALL_R; b.vx = -(Math.abs(b.vx) + SPEED_INC)
    b.vy += ((b.y - (rp.y + PAD_H / 2)) / (PAD_H / 2)) * 2; sfx.paddleHit()
  }
  b.vy = clamp(b.vy, -10, 10)

  if (b.x < 0) { state.right.score++; sfx.score(); checkWin(mode === 'cpu' ? 'Computer' : 'P2'); reset(1)  }
  if (b.x > W) { state.left.score++;  sfx.score(); checkWin('P1'); reset(-1) }
}

function checkWin(winner: string): void {
  if (state.left.score < WIN_SCORE && state.right.score < WIN_SCORE) return
  running = false; lastWinner = winner; sfx.win()
  const name = winner === 'P1' ? myDisplayName()
             : winner === 'P2' ? 'P2'
             : 'Computer'
  msg.textContent = isTouch ? `${name} wins! — Tap to play again` : `${name} wins! — Space to play again`
  saveResult(winner, name, mode === 'cpu' ? `vs CPU (${difficulty})` : 'Local 2P')
}

// ── Draw ───────────────────────────────────────────────────────────────────────
function draw(): void {
  ctx.clearRect(0, 0, W, H)
  ctx.setLineDash([10, 10]); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([])

  ctx.fillStyle = '#fff'
  ctx.fillRect(20, state.left.y, PAD_W, PAD_H)
  ctx.fillRect(W - 20 - PAD_W, state.right.y, PAD_W, PAD_H)
  ctx.beginPath(); ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, Math.PI * 2); ctx.fill()

  ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fillText(String(state.left.score),  W / 4,   60)
  ctx.fillText(String(state.right.score), W * 3 / 4, 60)

  ctx.font = '12px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.28)'
  if (onlineRole) {
    const leftLabel  = onlineRole === 'host' ? 'You' : opponentName
    const rightLabel = onlineRole === 'host' ? opponentName : 'You'
    ctx.fillText(leftLabel,  W / 4,   80)
    ctx.fillText(rightLabel, W * 3 / 4, 80)
  } else {
    ctx.fillText(myDisplayName(),              W / 4,   80)
    ctx.fillText(mode === 'cpu' ? 'CPU' : 'P2', W * 3 / 4, 80)
  }
}

function updateOverlay(): void {
  octx.clearRect(0, 0, W, H)
  if (!isTouch) return
  if (tp.left  !== null) { octx.fillStyle = 'rgba(255,255,255,0.05)'; octx.fillRect(0,     0, W / 2, H) }
  if (tp.right !== null) { octx.fillStyle = 'rgba(255,255,255,0.05)'; octx.fillRect(W / 2, 0, W / 2, H) }
}

function updateInfo(): void {
  if (onlineRole) return
  info.textContent = isTouch
    ? (mode === 'human' ? 'Drag left — P1  |  Drag right — P2' : 'Drag left to move your paddle')
    : (mode === 'human' ? 'W/S — P1  |  ↑/↓ — P2  |  Space — Pause  |  Esc — Menu'
                        : 'W/S — paddle  |  Space — Pause  |  Esc — Menu')
}

function loop(): void { update(); draw(); if (running) animId = requestAnimationFrame(loop) }

// ── Leaderboard ────────────────────────────────────────────────────────────────
const LB_KEY = 'pong_leaderboard'
const loadLB = (): LeaderboardEntry[] => {
  try { return JSON.parse(localStorage.getItem(LB_KEY) || '[]') as LeaderboardEntry[] } catch { return [] }
}
const saveLB = (d: LeaderboardEntry[]) => localStorage.setItem(LB_KEY, JSON.stringify(d))

async function saveResult(winner: string, displayName: string, modeLabel: string): Promise<void> {
  const entry: LeaderboardEntry = {
    winner: displayName || winner,
    mode:   modeLabel || (mode === 'cpu' ? `vs CPU (${difficulty})` : '2 Players'),
    score:  `${state.left.score}–${state.right.score}`,
    date:   new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' } as Intl.DateTimeFormatOptions),
  }
  const lb = loadLB(); lb.unshift(entry); saveLB(lb.slice(0, 20))
  try { await saveEntry(entry, myDisplayName()) } catch (e) { console.warn('Firestore:', e) }
}

async function renderLeaderboard(): Promise<void> {
  const body  = document.getElementById('lb-body') as HTMLElement
  const empty = document.getElementById('lb-empty') as HTMLElement
  const src   = document.getElementById('lb-source') as HTMLElement
  body.innerHTML = `<tr><td colspan="5" style="opacity:0.3;text-align:center;padding:16px">Loading…</td></tr>`

  let lb: LeaderboardEntry[]
  let online = false
  try {
    lb = await getEntries(); online = true
  } catch {
    lb = loadLB()
  }

  src.textContent = online ? '🌐 Online leaderboard' : '💾 Local scores only'
  body.innerHTML = ''
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
  detectTouch()
  selectMode('cpu')
  selectDiff('medium')
  resizeGame()
  const savedName = localStorage.getItem('pong_guest_name')
  if (savedName) (document.getElementById('guest-name-input') as HTMLInputElement).value = savedName
}

// Re-export toggleSound with the right signature for window binding
export function toggleSound(): void {
  audioToggleSound(btnSound)
}
