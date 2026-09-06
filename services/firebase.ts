import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseAppletConfig from '../firebase-applet-config.json';

// Get Firebase configuration
let firebaseConfig: any = (firebaseAppletConfig as any).default || firebaseAppletConfig;

if (!firebaseConfig || !firebaseConfig.apiKey) {
  try {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
    const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig?.firestoreDatabaseId;
    
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
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    const dbId = firebaseConfig.firestoreDatabaseId;
    if (dbId) {
      console.log(`[Firebase] Initializing Firestore with Database ID: ${dbId}`);
      db = getFirestore(app, dbId);
    } else {
      console.warn("[Firebase] No firestoreDatabaseId found, falling back to '(default)'");
      db = getFirestore(app);
    }
    
    storage = getStorage(app);
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
} else {
  console.error("Firebase is not initialized due to missing configuration.");
}
