import * as admin from 'firebase-admin';
import { env } from './env';

// We initialize using the default credentials. 
// In production, GOOGLE_APPLICATION_CREDENTIALS env var should be set.
// For local development, we can provide a service account JSON, or rely on application default credentials.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // If you have a specific service account file, you can use:
      // credential: admin.credential.cert(require('../../service-account.json')),
      credential: admin.credential.applicationDefault()
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
