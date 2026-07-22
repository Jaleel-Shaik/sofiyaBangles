import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithCredential, GoogleAuthProvider, getIdToken } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../store/authStore';
import { apiClient } from './client';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '158053850417-YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
});

export const login = async (email: string, password: string) => {
  try {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    const db = getFirestore();
    const userRef = doc(db, 'profiles', userCredential.user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.data() != null) {
      const userData = userDoc.data() as any;
      const user = { ...userData, id: userCredential.user.uid };
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
  } catch (error: any) {
    throw new Error(error.message || 'Login failed');
  }
};

export const register = async (params: { full_name: string; email: string; password: string; phone?: string; role?: string }) => {
  const { full_name, email, password, phone, role } = params;
  try {
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const userData = {
      id: uid,
      email,
      full_name,
      phone: phone || '',
      role: role || 'user',
      created_at: new Date().toISOString(),
      is_active: true
    };

    const db = getFirestore();
    const userRef = doc(db, 'profiles', uid);
    await setDoc(userRef, userData);
    
    // Store the bcrypt password hash on the backend so backend login can verify passwords
    try {
      await apiClient.post('/auth/set-password', { email, password });
    } catch (hashErr) {
      console.error('Failed to store password hash on backend:', hashErr);
      // Non-critical - Firebase Auth still works for mobile login
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
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
};

export const signInWithGoogle = async () => {
  try {
    // Check if your device supports Google Play
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Get the users ID token
    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;
    
    if (!idToken) throw new Error("No ID token found");

    // Create a Google credential with the token
    const googleCredential = GoogleAuthProvider.credential(idToken);

    // Sign-in the user with the credential
    const auth = getAuth();
    const userCredential = await signInWithCredential(auth, googleCredential);
    const uid = userCredential.user.uid;

    // Check if user exists in Firestore
    const db = getFirestore();
    const userRef = doc(db, 'profiles', uid);
    const userDoc = await getDoc(userRef);

    let userData: any;
    if (userDoc.exists()) {
      userData = { ...userDoc.data(), id: uid };
    } else {
      // First time Google login, create profile
      userData = {
        id: uid,
        email: userCredential.user.email || '',
        full_name: userCredential.user.displayName || 'Google User',
        role: 'user', // Default strictly to user
        created_at: new Date().toISOString(),
        is_active: true,
        avatar_url: userCredential.user.photoURL || null
      };
      await setDoc(userRef, userData);
    }

    const token = await getIdToken(userCredential.user);
    await useAuthStore.getState().login(userData, token);
    return { success: true, user: userData };

  } catch (error: any) {
    console.error("Google Sign-In Error", error);
    throw new Error(error.message || 'Google Sign-In failed');
  }
};

export const sendOtp = async (email: string, phone?: string) => {
  try {
    const res = await apiClient.post('/auth/send-otp', { email, phone });
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to send OTP');
  }
};

export const verifyOtp = async (email: string, otp: string) => {
  try {
    const res = await apiClient.post('/auth/verify-otp', { email, otp });
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to verify OTP');
  }
};

export const verify2FAOtp = async (otpPendingToken: string, otpCode: string) => {
  try {
    const res = await apiClient.post('/auth/verify-2fa', {
      otp_pending_token: otpPendingToken,
      otp_code: otpCode,
    }, {
      headers: {
        'x-client-type': 'mobile',
      },
    });
    
    // Note: LoginScreen handles calling useAuthStore.login() with the returned data
    // including refresh_token. The API layer should not modify store state.
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Google Authenticator OTP verification failed');
  }
};

export const loginWith2FA = async (email: string, password: string) => {
  try {
    const res = await apiClient.post('/auth/login', { email, password }, {
      headers: {
        'x-client-type': 'mobile',
      },
    });
    
    // Do NOT auto-login here - the login screen handles the full 2FA flow
    // This allows the screen to check for require_otp, setup_required, etc.
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

/**
 * Login using Firebase Auth ID token.
 * The mobile app signs in via Firebase Auth SDK first, then sends the verified
 * ID token to the backend. This bypasses the need for password_hash in Firestore
 * for users registered via mobile (Firebase Auth).
 */
export const firebaseLoginWithToken = async (firebaseToken: string) => {
  try {
    const res = await apiClient.post('/auth/firebase-login', { 
      firebase_token: firebaseToken 
    }, {
      headers: {
        'x-client-type': 'mobile',
      },
    });
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};


export const updateUserProfile = async (uid: string, data: any) => {
  try {
    const db = getFirestore();
    const userRef = doc(db, 'profiles', uid);
    await setDoc(userRef, data, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error("Update Profile Error", error);
    throw new Error(error.message || 'Failed to update profile');
  }
};
