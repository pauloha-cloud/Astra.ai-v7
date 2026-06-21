import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, appleProvider, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  reloadUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUserToFirestore = async (currentUser: User) => {
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      const userDoc = await getDoc(userRef);
      
      const userData: any = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        updatedAt: serverTimestamp()
      };

      if (!userDoc.exists()) {
        userData.createdAt = serverTimestamp();
        userData.plan = 'free';
      }

      await setDoc(userRef, userData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Sync user to Firestore only when email is verified
        if (currentUser.emailVerified) {
          await syncUserToFirestore(currentUser);
        }
      }
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      await signInWithPopup(auth, appleProvider);
    } catch (error) {
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
    } catch (error) {
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
      } catch (error) {
        throw error;
      }
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };

  const reloadUser = async () => {
    if (auth.currentUser) {
      try {
        await auth.currentUser.reload();
        const updatedUser = auth.currentUser;
        setUser({ ...updatedUser });
        if (updatedUser.emailVerified) {
          await syncUserToFirestore(updatedUser);
        }
      } catch (error) {
        throw error;
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signInWithGoogle, 
      signInWithApple, 
      signUpWithEmail, 
      signInWithEmail, 
      sendVerificationEmail, 
      sendPasswordReset,
      reloadUser, 
      signOut 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
