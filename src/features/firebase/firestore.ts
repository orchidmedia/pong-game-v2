import {
  collection, doc, addDoc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, orderBy, limit, where, QueryConstraint,
  serverTimestamp, DocumentData
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

// ── Spec-aligned generic CRUD ─────────────────────────────────────────────────

function fs() {
  const db = getFirebaseFS()
  if (!db) throw new Error('Firestore not initialised')
  return db
}

export async function firestoreGet(coll: string, docId: string): Promise<DocumentData | null> {
  const snap = await getDoc(doc(fs(), coll, docId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function firestoreSet(
  coll: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<void> {
  return setDoc(doc(fs(), coll, docId), data)
}

export async function firestoreUpdate(
  coll: string,
  docId: string,
  updates: Record<string, unknown>,
): Promise<void> {
  return updateDoc(doc(fs(), coll, docId), updates)
}

export async function firestoreQuery(
  coll: string,
  constraints: QueryConstraint[],
): Promise<DocumentData[]> {
  const q = query(collection(fs(), coll), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function firestoreDelete(coll: string, docId: string): Promise<void> {
  return deleteDoc(doc(fs(), coll, docId))
}

// Re-export query helpers for caller convenience
export { where, orderBy, limit } from 'firebase/firestore'
