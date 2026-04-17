import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import config from '@/config';
let app = null;
let auth = null;
let db = null;
let rtdb = null;
export function initFirebase() {
    if (!config.isConfigured)
        return;
    app = initializeApp(config.firebase);
    auth = getAuth(app);
    db = getFirestore(app);
    rtdb = getDatabase(app);
}
export function getFirebaseAuth() { return auth; }
export function getFirebaseFS() { return db; }
export function getFirebaseRTDB() { return rtdb; }
