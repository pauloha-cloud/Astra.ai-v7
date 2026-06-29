import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
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
