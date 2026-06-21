import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Connected");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration. The client is offline.");
      } else {
        console.error("Firebase connection test failed:", error.message);
      }
    } else {
      console.error("Firebase connection test failed with an unknown error:", error);
    }
  }
}
testConnection();
