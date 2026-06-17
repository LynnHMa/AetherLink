import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Safely attempt to load the config file, fallback to env vars if it doesn't exist
// @ts-ignore
const configs = import.meta.glob('../../firebase-applet-config.json', { eager: true });
let firebaseConfig: any = configs['../../firebase-applet-config.json'] 
  ? (configs['../../firebase-applet-config.json'] as any).default 
  : null;

if (!firebaseConfig) {
  firebaseConfig = {
    // @ts-ignore
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    // @ts-ignore
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    // @ts-ignore
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    // @ts-ignore
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    // @ts-ignore
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    // @ts-ignore
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    // @ts-ignore
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
  };
}

export let app: FirebaseApp | null = null;
export let db: Firestore | null = null;
export let auth: Auth | null = null;

if (firebaseConfig && firebaseConfig.apiKey) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
  } catch (e) {
    console.warn("Firebase initialization skipped:", e);
  }
}

