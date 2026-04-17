import type { User as FirebaseUser } from 'firebase/auth'

// Re-export Firebase User type
export type { FirebaseUser as User }

export interface FirebaseConfig {
  apiKey:            string
  authDomain:        string
  databaseURL:       string
  projectId:         string
  storageBucket:     string
  messagingSenderId: string
  appId:             string
}

export interface PlayerState {
  paddleY: number
  name?:   string
}

export interface GameRoom {
  status:   'waiting' | 'playing' | 'finished'
  host:     PlayerState & { name: string }
  guest:    (PlayerState & { name: string }) | null
  ball:     { x: number; y: number; vx: number; vy: number }
  score:    { host: number; guest: number }
  ready?:   { host: boolean; guest: boolean }
  resumeAt?: number
  winner?:  string
}

export interface Score {
  winner:       string
  mode:         string
  score:        string
  date:         string
  displayName?: string
  uid?:         string | null
}

export type AuthProvider = 'google' | 'github'
