import { ref as dbRef, set, get, update, onValue, remove, onDisconnect } from 'firebase/database';
import { getFirebaseRTDB } from './setup';
export function getRoomRef(code) {
    const db = getFirebaseRTDB();
    if (!db)
        return null;
    return dbRef(db, `rooms/${code}`);
}
export { set, get, update, onValue, remove, onDisconnect };
