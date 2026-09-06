import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseAppletConfig from '../firebase-applet-config.json';

// Get Firebase configuration
let firebaseConfig: any = firebaseAppletConfig;

if (!firebaseConfig || !firebaseConfig.apiKey) {
  try {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
    const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseAppletConfig?.firestoreDatabaseId;
    
    if (apiKey && authDomain && projectId) {
      firebaseConfig = {
        apiKey,
        authDomain,
        projectId,
        storageBucket,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
        firestoreDatabaseId
      };
    }
  } catch (e) {
    console.warn("Failed to read firebase config:", e);
  }
}

// Ensure we have a valid config before initializing
let app: any = null;
export let auth: any = null;
export let db: any = null;
export let storage: any = null;
export const googleProvider = new GoogleAuthProvider();

if (firebaseConfig && firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = firebaseConfig.firestoreDatabaseId 
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
    : getFirestore(app);
  storage = getStorage(app);
} else {
  console.error("Firebase is not initialized due to missing configuration.");
}
