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
