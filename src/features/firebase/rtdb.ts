import {
  ref as dbRef, set, get, update, onValue, remove,
  onDisconnect, DatabaseReference, DataSnapshot
} from 'firebase/database'
import { getFirebaseRTDB } from './setup'

export function getRoomRef(code: string): DatabaseReference | null {
  const db = getFirebaseRTDB()
  if (!db) return null
  return dbRef(db, `rooms/${code}`)
}

export { set, get, update, onValue, remove, onDisconnect }
export type { DatabaseReference, DataSnapshot }

// ── Spec-aligned path-based wrappers ──────────────────────────────────────────

function r(path: string): DatabaseReference {
  const db = getFirebaseRTDB()
  if (!db) throw new Error(`RTDB not initialised (path: ${path})`)
  return dbRef(db, path)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function dbGet(path: string): Promise<any> {
  return (await get(r(path))).val()
}

export async function dbSet(path: string, value: unknown): Promise<void> {
  return set(r(path), value)
}

export async function dbUpdate(path: string, updates: Record<string, unknown>): Promise<void> {
  return update(r(path), updates)
}

export function dbOnValue(path: string, callback: (data: unknown) => void): () => void {
  return onValue(r(path), snap => callback(snap.val()))
}

export async function dbRemove(path: string): Promise<void> {
  return remove(r(path))
}

export async function dbOnDisconnect(
  path: string,
  action: 'remove' | 'set',
  value?: unknown,
): Promise<void> {
  const od = onDisconnect(r(path))
  if (action === 'remove') return od.remove()
  return od.set(value)
}
