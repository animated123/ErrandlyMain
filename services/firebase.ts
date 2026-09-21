import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseAppletConfig from '../firebase-applet-config.json';

// Get Firebase configuration
const rawConfig: any = (firebaseAppletConfig as any).default || firebaseAppletConfig;
let firebaseConfig: any = rawConfig ? { ...rawConfig } : null;

// Ensure authDomain is set to auth.errandly.site for custom domain Google OAuth
const configuredAuthDomain = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN) 
  || firebaseConfig?.authDomain 
  || 'auth.errandly.site';

if (firebaseConfig) {
  firebaseConfig.authDomain = configuredAuthDomain;
}

if (!firebaseConfig || !firebaseConfig.apiKey) {
  try {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'auth.errandly.site';
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
    const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig?.firestoreDatabaseId;
    
    if (apiKey && projectId) {
      firebaseConfig = {
        apiKey,
        authDomain: authDomain || 'auth.errandly.site',
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

// Silence internal Firestore console warnings when running against offline/unprovisioned database
try {
  setLogLevel('silent');
} catch (_) {
  // Ignore in environments without loglevel support
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
    if (dbId && dbId !== '(default)') {
      console.log(`[Firebase] Initializing Firestore with Database ID: ${dbId}`);
      db = getFirestore(app, dbId);
    } else {
      console.log("[Firebase] Initializing Firestore with '(default)' database");
      db = getFirestore(app);
    }
    
    storage = getStorage(app);
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
} else {
  console.error("Firebase is not initialized due to missing configuration.");
}

