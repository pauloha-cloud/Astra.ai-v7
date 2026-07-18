import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userPlan: string;
  subscriptionStatus: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;
  billingInterval?: string;
  currentPeriodEnd?: any;
  cancelAtPeriodEnd?: boolean;
  limits?: {
    monthlyAnalyses?: number;
    monthlyVoiceTutorMinutes?: number;
    maxVideoDurationMinutes?: number;
  };
  signInWithGoogle: () => Promise<void>;
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
  const [userPlan, setUserPlan] = useState<string>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('active');
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string>('');
  const [stripeCustomerId, setStripeCustomerId] = useState<string>('');
  const [stripePriceId, setStripePriceId] = useState<string>('');
  const [billingInterval, setBillingInterval] = useState<string>('month');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<any>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
  const [limits, setLimits] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      setUserPlan('free');
      setSubscriptionStatus('no_plan');
      setStripeSubscriptionId('');
      setStripeCustomerId('');
      setStripePriceId('');
      setBillingInterval('month');
      setCurrentPeriodEnd(null);
      setCancelAtPeriodEnd(false);
      setLimits(null);
      return;
    }

    let userDocData: any = null;
    let billingDocData: any = null;

    function updateState() {
      const finalPlan = billingDocData?.plan || userDocData?.plan || 'free';
      const finalStatus = billingDocData?.status || userDocData?.planStatus || userDocData?.subscriptionStatus || 'no_plan';
      const finalStripeSubscriptionId = billingDocData?.stripeSubscriptionId || userDocData?.stripeSubscriptionId || '';
      const finalStripeCustomerId = billingDocData?.stripeCustomerId || userDocData?.stripeCustomerId || '';
      const finalStripePriceId = billingDocData?.stripePriceId || userDocData?.stripePriceId || '';
      const finalBillingInterval = userDocData?.billingInterval || 'month';
      const finalCurrentPeriodEnd = billingDocData?.currentPeriodEnd || userDocData?.currentPeriodEnd || null;
      const finalCancelAtPeriodEnd = billingDocData?.cancelAtPeriodEnd ?? userDocData?.cancelAtPeriodEnd ?? false;
      const finalLimits = userDocData?.limits || null;

      setUserPlan(finalPlan);
      setSubscriptionStatus(finalStatus);
      setStripeSubscriptionId(finalStripeSubscriptionId);
      setStripeCustomerId(finalStripeCustomerId);
      setStripePriceId(finalStripePriceId);
      setBillingInterval(finalBillingInterval);
      setCurrentPeriodEnd(finalCurrentPeriodEnd);
      setCancelAtPeriodEnd(finalCancelAtPeriodEnd);
      setLimits(finalLimits);
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        userDocData = snapshot.data();
      } else {
        userDocData = null;
      }
      updateState();
    }, (error) => {
      console.error("Error listening to user document:", error);
    });

    const billingRef = doc(db, 'users', user.uid, 'billing', 'current');
    const unsubBilling = onSnapshot(billingRef, (snapshot) => {
      if (snapshot.exists()) {
        billingDocData = snapshot.data();
      } else {
        billingDocData = null;
      }
      updateState();
    }, (error) => {
      console.error("Error listening to billing document:", error);
    });

    return () => {
      unsubUser();
      unsubBilling();
    };
  }, [user]);

  const syncUserToFirestore = async (currentUser: User) => {
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      const userDoc = await getDoc(userRef);
      
      const userData: any = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || '',
        photoURL: currentUser.photoURL || '',
        updatedAt: serverTimestamp()
      };

      if (!userDoc.exists()) {
        userData.createdAt = serverTimestamp();
        userData.plan = 'free';
      }

      console.log("Syncing basic user profile only:", currentUser.uid);
      await setDoc(userRef, userData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          await syncUserToFirestore(currentUser);
        } catch (syncError) {
          console.error("Failed to sync user to Firestore on auth change:", syncError);
        }
      }
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    console.log("Firebase auth:", auth);
    console.log("Google provider:", provider);
    console.log("Starting Google login...");

    try {
      if (!auth) {
        throw new Error("Firebase Auth is not initialized.");
      }
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error && error.code === 'auth/popup-closed-by-user') {
        console.log("User closed the Google sign-in popup.");
        return; // Handled gracefully, do not rethrow to avoid Unhandled Rejection
      }
      if (error && error.code === 'auth/argument-error') {
        console.error("Firebase Auth argument error: Please check your configuration.", error);
        return;
      }
      if (error && (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported')) {
        console.log("Google popup blocked or unsupported, trying sign-in with redirect fallback...");
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          console.error("Redirect fallback error:", redirectError);
          throw redirectError;
        }
      }
      console.warn("Google sign in error", error);
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
        setUser(updatedUser);
        if (updatedUser.emailVerified) {
          try {
            await syncUserToFirestore(updatedUser);
          } catch (syncError) {
            console.error("Failed to sync user to Firestore on reload:", syncError);
          }
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
      userPlan,
      subscriptionStatus,
      stripeSubscriptionId,
      stripeCustomerId,
      stripePriceId,
      billingInterval,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      limits,
      signInWithGoogle, 
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
