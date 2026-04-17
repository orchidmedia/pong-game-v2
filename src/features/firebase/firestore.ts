import {
  collection, addDoc, getDocs, query, orderBy, limit,
  serverTimestamp
} from 'firebase/firestore'
import { getFirebaseFS } from './setup'
import { currentUser } from './auth'

export interface LeaderboardEntry {
  id?:         string
  winner:      string
  mode:        string
  score:       string
  date:        string
  displayName?: string
  uid?:        string | null
}

export async function saveEntry(entry: LeaderboardEntry, displayName: string): Promise<void> {
  const db = getFirebaseFS()
  if (!db) return
  await addDoc(collection(db, 'leaderboard'), {
    ...entry,
    uid:         currentUser?.uid ?? null,
    displayName: displayName || entry.winner,
    timestamp:   serverTimestamp(),
  })
}

export async function getEntries(): Promise<LeaderboardEntry[]> {
  const db = getFirebaseFS()
  if (!db) throw new Error('not configured')
  const q = query(collection(db, 'leaderboard'), orderBy('timestamp', 'desc'), limit(20))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as LeaderboardEntry) }))
}
