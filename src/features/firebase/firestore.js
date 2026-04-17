import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { getFirebaseFS } from './setup';
import { currentUser } from './auth';
export async function saveEntry(entry, displayName) {
    const db = getFirebaseFS();
    if (!db)
        return;
    await addDoc(collection(db, 'leaderboard'), {
        ...entry,
        uid: currentUser?.uid ?? null,
        displayName: displayName || entry.winner,
        timestamp: serverTimestamp(),
    });
}
export async function getEntries() {
    const db = getFirebaseFS();
    if (!db)
        throw new Error('not configured');
    const q = query(collection(db, 'leaderboard'), orderBy('timestamp', 'desc'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
