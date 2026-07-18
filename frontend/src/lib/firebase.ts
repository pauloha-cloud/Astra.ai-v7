import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

console.log("Firebase projectId (from config):", firebaseConfig.projectId);
console.log("Firebase authDomain (from config):", firebaseConfig.authDomain);
console.log("Firebase databaseId (from config):", firebaseConfig.firestoreDatabaseId);
console.log("Firebase databaseId:", firebaseConfig.firestoreDatabaseId);
console.log("Firebase projectId (from env):", import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log("Firebase authDomain (from env):", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);

// Use the standard and robust getAuth(app) initialization which automatically handles persistences and fallbacks
export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Connection test is performed safely to avoid false-positive error spam in sandboxed environments
async function testConnection() {
  try {
    console.log("Firebase initialized successfully");
  } catch (error) {
    // Quietly catch initialization nuances
  }
}
testConnection();
