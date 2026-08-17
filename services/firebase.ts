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
    
    if (apiKey && authDomain && projectId) {
      firebaseConfig = {
        apiKey,
        authDomain,
        projectId,
        storageBucket,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
      };
    } else {
      const promptApiKey = window.prompt("Missing Firebase Config. Please enter VITE_FIREBASE_API_KEY:");
      const promptAuthDomain = window.prompt("Please enter VITE_FIREBASE_AUTH_DOMAIN:");
      const promptProjectId = window.prompt("Please enter VITE_FIREBASE_PROJECT_ID:");
      
      if (promptApiKey && promptAuthDomain && promptProjectId) {
        firebaseConfig = {
          apiKey: promptApiKey,
          authDomain: promptAuthDomain,
          projectId: promptProjectId,
          storageBucket: window.prompt("Enter VITE_FIREBASE_STORAGE_BUCKET (optional):") || undefined,
          messagingSenderId: window.prompt("Enter VITE_FIREBASE_MESSAGING_SENDER_ID (optional):") || undefined,
          appId: window.prompt("Enter VITE_FIREBASE_APP_ID (optional):") || undefined,
        };
      }
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
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  console.error("Firebase is not initialized due to missing configuration.");
}
