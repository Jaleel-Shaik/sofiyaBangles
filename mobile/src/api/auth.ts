import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithCredential, GoogleAuthProvider, getIdToken } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuthStore, User } from '../store/authStore';
import { apiClient } from './client';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '158053850417-YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
});

// Accounts are split across "users" and "admins" collections.
const accountCollection = (role?: string): string =>
  role === 'admin' || role === 'super_admin' ? 'admins' : 'users';

/** Reads an account from both collections (users first, then admins). */
const readAccountDoc = async (uid: string): Promise<{ data: Record<string, unknown>; role: string } | null> => {
  const db = getFirestore();
  for (const coll of ['users', 'admins']) {
    const snap = await getDoc(doc(db, coll, uid));
    if (snap.exists()) return { data: snap.data() || {}, role: coll === 'admins' ? 'admin' : 'user' };
  }
  return null;
};

export const login = async (email: string, password: string) => {
  try {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    const account = await readAccountDoc(userCredential.user.uid);
    
    if (account) {
      const userData = account.data as Partial<User>;
      const user: User = {
        id: userCredential.user.uid,
        email: userCredential.user.email || email,
        role: userData.role || account.role,
        ...userData,
      };
      const token = await getIdToken(userCredential.user);
      if (user.role === 'admin') {
        return { success: true, user, token, requiresOtp: true };
      }
      
      // Use Firebase token for session
      await useAuthStore.getState().login(user, token);
      return { success: true, user };
    } else {
      throw new Error('User profile not found in database.');
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    throw new Error(message);
  }
};

export const register = async (params: { full_name: string; email: string; password: string; phone?: string; role?: string }) => {
  const { full_name, email, password, phone, role } = params;
  try {
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const userData: User = {
      id: uid,
      email,
      full_name,
      phone: phone || '',
      role: role || 'user',
      is_2fa_enabled: false,
    };

    const db = getFirestore();
    const userRef = doc(db, accountCollection(role), uid);
    await setDoc(userRef, userData);
    
    // Store the bcrypt password hash on the backend so backend login can verify passwords
    // Retry up to 3 times with backoff if it fails
    for (let retry = 0; retry < 3; retry++) {
      try {
        await apiClient.post('/auth/set-password', { email, password });
        break; // Success, exit retry loop
      } catch (hashErr: unknown) {
        const isLastRetry = retry === 2;
        if (isLastRetry) {
          console.error('Failed to store password hash on backend after 3 retries:', hashErr);
        } else {
          // Wait before retrying (exponential backoff: 1s, 2s)
          console.log(`Retrying set-password (attempt ${retry + 2}/3)...`);
          await new Promise(r => setTimeout(r, (retry + 1) * 1000));
        }
      }
    }
    
    const token = await getIdToken(userCredential.user);
    
    if (userData.role === 'admin') {
      // Do NOT log them in automatically so they are forced to go through OTP flow
      // Also log them out of Firebase Auth so they start fresh on the login screen
      await auth.signOut();
      return { success: true, message: "Registered successfully. Please log in to verify OTP.", user: userData };
    }

    // For non-admin roles, log in automatically
    await useAuthStore.getState().login(userData, token);
    
    return { success: true, user: userData };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    throw new Error(message);
  }
};

export const signInWithGoogle = async () => {
  try {
    // Check if your device supports Google Play
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Get the users ID token
    const signInResult = await GoogleSignin.signIn();
    
    let idToken = signInResult.data?.idToken;
    if (!idToken) {
      // fallback for older versions/payload shapes
      idToken = (signInResult as unknown as { idToken?: string }).idToken;
    }

    if (!idToken) {
      throw new Error('Google Sign-In failed: No ID token returned');
    }

    // Create a Google credential with the token
    const googleCredential = GoogleAuthProvider.credential(idToken);

    // Sign-in the user with the credential
    const auth = getAuth();
    const userCredential = await signInWithCredential(auth, googleCredential);
    const uid = userCredential.user.uid;

    // Check if user exists in Firestore (users or admins)
    const db = getFirestore();
    const account = await readAccountDoc(uid);

    let userData: User;
    if (account) {
      userData = {
        id: uid,
        email: userCredential.user.email || '',
        role: 'user',
        ...(account.data as Partial<User>),
      };
    } else {
      // First time Google login, create profile in the users collection
      userData = {
        id: uid,
        email: userCredential.user.email || '',
        full_name: userCredential.user.displayName || 'Google User',
        role: 'user', // Default strictly to user
        avatar_url: userCredential.user.photoURL || undefined
      };
      await setDoc(doc(db, 'users', uid), userData);
    }

    const token = await getIdToken(userCredential.user);
    await useAuthStore.getState().login(userData, token);
    return { success: true, user: userData };

  } catch (error: unknown) {
    console.error("Google Sign-In Error", error);
    const message = error instanceof Error ? error.message : 'Google Sign-In failed';
    throw new Error(message);
  }
};

export const logout = async () => {
  try {
    const auth = getAuth();
    await auth.signOut();
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore if not signed in with Google
    }
    await useAuthStore.getState().logout();
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    throw new Error(message);
  }
};

export const getCurrentUser = () => {
  const auth = getAuth();
  return auth.currentUser;
};

export const resetPassword = async (email: string) => {
  try {
    const auth = getAuth();
    await auth.sendPasswordResetEmail(email);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Password reset failed';
    throw new Error(message);
  }
};

export const updatePassword = async (newPassword: string) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('No user currently logged in');
    
    await user.updatePassword(newPassword);

    // Also update bcrypt hash in users collection so backend password verification stays in sync
    if (user.email) {
      try {
        await apiClient.post('/auth/set-password', {
          email: user.email,
          password: newPassword,
        });
      } catch (backendErr) {
        console.warn('Could not sync updated password hash to backend:', backendErr);
      }
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Password update failed';
    throw new Error(message);
  }
};

export const loginWithCustomToken = async (customToken: string) => {
  try {
    const auth = getAuth();
    const userCredential = await auth.signInWithCustomToken(customToken);
    const uid = userCredential.user.uid;

    const account = await readAccountDoc(uid);
    if (!account) {
      throw new Error('User profile not found in database.');
    }

    const userData = account.data as Partial<User>;
    const user: User = {
      id: uid,
      email: userCredential.user.email || '',
      role: userData.role || account.role,
      ...userData,
    };
    const token = await getIdToken(userCredential.user);

    await useAuthStore.getState().login(user, token);
    return { success: true, user };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    throw new Error(message);
  }
};

export const firebaseLogin = async (firebaseToken: string) => {
  const res = await apiClient.post('/auth/firebase-login', { 
    firebase_token: firebaseToken 
  }, {
    headers: {
      'x-client-type': 'mobile',
    },
  });
  return res.data;
};

export const firebaseLoginWithToken = firebaseLogin;

export const loginWith2FA = async (email: string, password: string) => {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data;
};

export interface Verify2FAPayload {
  otp_pending_token?: string;
  challenge_id?: string;
  challengeId?: string;
  email?: string;
  otp_code?: string;
  otp?: string;
  useBackupCode?: boolean;
  use_backup_code?: boolean;
}

export const verify2FAOtp = async (payload: Verify2FAPayload) => {
  const res = await apiClient.post('/auth/verify-2fa', payload);
  return res.data;
};

export const updateUserProfile = async (uid: string, data: Partial<User> & Record<string, unknown>) => {
  try {
    const db = getFirestore();
    const role = typeof data?.role === 'string' ? data.role : 'user';
    const userRef = doc(db, accountCollection(role), uid);
    await setDoc(userRef, data, { merge: true });
    return { success: true };
  } catch (error: unknown) {
    console.error("Update Profile Error", error);
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    throw new Error(message);
  }
};
