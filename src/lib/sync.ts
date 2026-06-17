import { doc, getDoc, setDoc, collection, getDocs, writeBatch, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const saveSettingsToFirebase = async (userId: string, settings: any) => {
  const docRef = doc(db, 'users', userId);
  const snap = await getDoc(docRef);
  const payload = { ...settings, updatedAt: serverTimestamp() };
  if (!snap.exists()) {
    payload.createdAt = serverTimestamp();
  }
  await setDoc(docRef, payload, { merge: true });
};

export const loadSettingsFromFirebase = async (userId: string) => {
  const docRef = doc(db, 'users', userId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data();
  }
  return null;
};

export const saveSessionToFirebase = async (userId: string, session: any) => {
  const docRef = doc(db, `users/${userId}/sessions`, session.id);
  const payload = {
     ...session,
     updatedAt: Date.now()
  };
  if (!payload.createdAt) {
      payload.createdAt = Date.now();
  }
  
  // ensure user doc exists
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
      await setDoc(userRef, { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  }

  await setDoc(docRef, payload, { merge: true });
};

export const loadSessionsFromFirebase = async (userId: string) => {
  const colRef = collection(db, `users/${userId}/sessions`);
  const snap = await getDocs(colRef);
  return snap.docs.map(doc => doc.data());
};

export const deleteSessionFromFirebase = async (userId: string, sessionId: string) => {
  const docRef = doc(db, `users/${userId}/sessions`, sessionId);
  await deleteDoc(docRef);
};
