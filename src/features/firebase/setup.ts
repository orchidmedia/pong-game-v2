import { initializeApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getDatabase, Database } from 'firebase/database'
import config from '@/config'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let rtdb: Database | null = null

export function initFirebase() {
  if (!config.isConfigured) return
  app  = initializeApp(config.firebase)
  auth = getAuth(app)
  db   = getFirestore(app)
  rtdb = getDatabase(app)
}

export function getFirebaseAuth(): Auth | null { return auth }
export function getFirebaseFS(): Firestore | null { return db }
export function getFirebaseRTDB(): Database | null { return rtdb }
