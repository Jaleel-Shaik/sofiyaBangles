import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../store/authStore';
import { apiClient } from './client';

// Configure Google Sign-In (You can call this once in an app initialization file like App.tsx or here)
GoogleSignin.configure({
  webClientId: '158053850417-YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // Typically needs to be configured based on your google-services.json
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
      const token = await userCredential.user.getIdToken();
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

export const register = async (email: string, password: string, fullName: string, role: string = 'user', phone: string = '') => {
  try {
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const userData = {
      id: uid,
      email,
      full_name: fullName,
      phone,
      role: role,
      created_at: new Date().toISOString(),
      is_active: true
    };

    const db = getFirestore();
    const userRef = doc(db, 'profiles', uid);
    await setDoc(userRef, userData);
    
    const token = await userCredential.user.getIdToken();
    
    if (userData.role === 'admin') {
      // Do NOT log them in automatically so they are forced to go through OTP flow
      // Also log them out of Firebase Auth so they start fresh on the login screen
      await auth.signOut();
      return { success: true, message: "Registered successfully. Please log in to verify OTP.", user: userData };
    }

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
    let userData: any;
    if (userDoc.data() != null) {
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

    const token = await userCredential.user.getIdToken();
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

