import { ref as dbRef } from 'firebase/database'
import { getFirebaseRTDB } from '@/features/firebase/setup'
import { get, set, update as rtdbUpdate, onValue, remove, onDisconnect } from '@/features/firebase/rtdb'
import { rt } from './runtime'
import { sfx } from '@/features/utils/audio'

function db() { return getFirebaseRTDB() }
function rp(sub = '') { return `rooms/${rt.onlineCode}${sub ? '/' + sub : ''}` }

export function genCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase()
}

export async function createRoom(
  myDisplayName: () => string,
  onGuestJoined: (name: string) => void,
): Promise<void> {
  const rtdb = db()
  if (!rtdb) { alert('Firebase not connected'); return }

  let code: string
  // eslint-disable-next-line no-constant-condition
  while (true) {
    code = genCode()
    const snap = await get(dbRef(rtdb, `rooms/${code}`))
    if (!snap.exists()) break
  }

  rt.myName     = myDisplayName()
  rt.onlineCode = code
  rt.onlineRole = 'host'
  rt.roomRef    = dbRef(rtdb, `rooms/${code}`)

  await set(rt.roomRef, {
    status: 'waiting',
    host:   { name: rt.myName, paddleY: rt.state.left.y },
    guest:  null,
    ball:   { x: rt.state.ball.x, y: rt.state.ball.y, vx: rt.state.ball.vx, vy: rt.state.ball.vy },
    score:  { host: 0, guest: 0 },
  })
  onDisconnect(rt.roomRef).remove()

  const guestNameRef = dbRef(rtdb, `rooms/${code}/guest/name`)
  const unsub = onValue(guestNameRef, snap => {
    if (snap.val()) {
      rt.opponentName = snap.val() as string
      unsub()
      onGuestJoined(rt.opponentName)
    }
  })
}

export async function joinRoom(
  myDisplayName: () => string,
  onJoined: () => void,
): Promise<void> {
  const code = (document.getElementById('ol-code-input') as HTMLInputElement).value.toUpperCase().trim()
  if (code.length !== 4) { alert('Enter a 4-letter code'); return }
  const rtdb = db()
  if (!rtdb) { alert('Firebase not connected'); return }

  const ref  = dbRef(rtdb, `rooms/${code}`)
  const snap = await get(ref)
  if (!snap.exists()) { alert('Room not found'); return }
  const data = snap.val() as Record<string, unknown>
  if (data.status !== 'waiting') { alert('Room is full or game already started'); return }

  const hostData   = data.host as Record<string, unknown> | null
  rt.myName        = myDisplayName()
  rt.opponentName  = (hostData?.name as string) || 'Host'
  rt.onlineCode    = code
  rt.onlineRole    = 'guest'
  rt.roomRef       = ref

  await set(dbRef(rtdb, `rooms/${code}/guest`), { name: rt.myName, paddleY: rt.state.right.y })
  onDisconnect(dbRef(rtdb, `rooms/${code}/guest`)).remove()
  onJoined()
}

export async function cancelRoom(): Promise<void> {
  if (rt.roomRef) { await remove(rt.roomRef); rt.roomRef = null }
  rt.onlineRole = null; rt.onlineCode = null
}

export function leaveRoom(): void {
  rt.onlineSubs.forEach(u => u())
  rt.onlineSubs = []
  cancelAnimationFrame(rt.countdownAnimId)
  rt.countdownAnimId = 0
  const rtdb = db()
  if (rtdb && rt.roomRef && rt.onlineCode) {
    if (rt.onlineRole === 'host') remove(rt.roomRef)
    else remove(dbRef(rtdb, `rooms/${rt.onlineCode}/guest`))
  }
  rt.roomRef = null; rt.onlineRole = null; rt.onlineCode = null; rt.myReady = false
}

export function syncHostToRTDB(): void {
  const now = Date.now()
  if (now - rt.lastSyncAt < 16) return
  rt.lastSyncAt = now
  const rtdb = db(); if (!rtdb || !rt.onlineCode) return
  rtdbUpdate(dbRef(rtdb, rp()), {
    'ball/x':       rt.state.ball.x,
    'ball/y':       rt.state.ball.y,
    'ball/vx':      rt.state.ball.vx,
    'ball/vy':      rt.state.ball.vy,
    'host/paddleY': rt.state.left.y,
    'score/host':   rt.state.left.score,
    'score/guest':  rt.state.right.score,
  })
}

export function syncGuestToRTDB(): void {
  const now = Date.now()
  if (now - rt.lastSyncAt < 16) return
  rt.lastSyncAt = now
  const rtdb = db(); if (!rtdb || !rt.onlineCode) return
  set(dbRef(rtdb, rp('guest/paddleY')), rt.state.right.y)
}

export interface RTDBCallbacks {
  startCountdown:       (n: number) => void
  opponentDisconnected: () => void
  onWin:                (winner: string) => void
}

export function setupRTDBListeners(callbacks: RTDBCallbacks): void {
  const rtdb = db()
  if (!rtdb || !rt.onlineCode) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function sub(path: string, cb: (snap: any) => void): void {
    const unsub = onValue(dbRef(rtdb!, rp(path)), cb)
    rt.onlineSubs.push(unsub)
  }

  // Ready coordination
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sub('ready', (snap: any) => {
    if (rt.running || rt.lastWinner !== null) return
    const r = snap.val() as { host: boolean; guest: boolean } | null
    if (!r) return
    if (r.host && r.guest) {
      if (rt.onlineRole === 'host') {
        set(dbRef(rtdb!, rp('resumeAt')), Date.now() + 3000)
        callbacks.startCountdown(3)
      }
    } else {
      const myFlag = rt.onlineRole === 'host' ? r.host : r.guest
      if (myFlag) {
        const msgEl = document.getElementById('message') as HTMLElement
        msgEl.textContent = 'Waiting for opponent…'
      }
    }
  })

  if (rt.onlineRole === 'guest') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('resumeAt', (snap: any) => {
      const t = snap.val() as number | null
      if (!t || rt.running) return
      cancelAnimationFrame(rt.animId)
      cancelAnimationFrame(rt.countdownAnimId)
      rt.running = false
      callbacks.startCountdown(Math.min(3, Math.max(1, Math.round((t - Date.now()) / 1000))))
    })
  }

  if (rt.onlineRole === 'host') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('guest/paddleY', (snap: any) => { if (snap.val() !== null) rt.state.right.y = snap.val() as number })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('guest', (snap: any) => { if (rt.running && snap.val() === null) callbacks.opponentDisconnected() })
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('ball', (snap: any) => {
      const b = snap.val() as { x: number; y: number; vx: number; vy: number } | null
      if (!b) return
      const dx = b.x - rt.state.ball.x; const dy = b.y - rt.state.ball.y
      if (Math.abs(dx) > 60 || Math.abs(dy) > 60) { Object.assign(rt.state.ball, b) }
      else { rt.state.ball.vx = b.vx; rt.state.ball.vy = b.vy; rt.state.ball.x += dx * 0.35; rt.state.ball.y += dy * 0.35 }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('host/paddleY', (snap: any) => { if (snap.val() !== null) rt.state.left.y = snap.val() as number })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('score', (snap: any) => {
      const s = snap.val() as { host: number; guest: number } | null
      if (s) { rt.state.left.score = s.host || 0; rt.state.right.score = s.guest || 0 }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('winner', (snap: any) => {
      if (snap.val() && rt.running) {
        rt.running = false
        const winner = snap.val() as string
        sfx.win()
        ;(document.getElementById('message') as HTMLElement).textContent = `${winner} wins!`
        rt.lastWinner = winner
        callbacks.onWin(winner)
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub('host', (snap: any) => { if (rt.running && snap.val() === null) callbacks.opponentDisconnected() })
  }
}
