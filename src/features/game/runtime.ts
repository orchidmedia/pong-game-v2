import type { GameState, GameMode, Difficulty, OnlineRole } from './state'
import type { DatabaseReference } from 'firebase/database'
import { W, H, PAD_H } from './constants'

// Shared mutable runtime — imported by all game modules to avoid circular deps
export const rt = {
  state: {
    left:     { y: H / 2 - PAD_H / 2, score: 0 },
    right:    { y: H / 2 - PAD_H / 2, score: 0 },
    ball:     { x: W / 2, y: H / 2, vx: 4, vy: 3 },
    aiTarget: H / 2,
  } as GameState,
  mode:            'cpu'    as GameMode,
  difficulty:      'medium' as Difficulty,
  running:         false,
  animId:          0,
  countdownAnimId: 0,
  lastWinner:      null as string | null,
  isTouch:         false,
  keys:            {} as Record<string, boolean>,
  tp:              { left: null as number | null, right: null as number | null },
  onlineRole:      null as OnlineRole | null,
  onlineCode:      null as string | null,
  roomRef:         null as DatabaseReference | null,
  myName:          '',
  opponentName:    '',
  myReady:         false,
  lastSyncAt:      0,
  onlineSubs:      [] as Array<() => void>,
}
