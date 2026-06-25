import * as admin from 'firebase-admin';
import { env } from './env';

import fs from 'fs';
import path from 'path';

// We initialize using the default credentials. 
// In production, GOOGLE_APPLICATION_CREDENTIALS env var should be set.
// For local development, we can provide a service account JSON, or rely on application default credentials.
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.resolve(__dirname, '../../service-account.json');
    let credential;

    if (fs.existsSync(serviceAccountPath)) {
      credential = admin.credential.cert(require(serviceAccountPath));
    } else {
      credential = admin.credential.applicationDefault();
    }

    admin.initializeApp({
      credential,
      storageBucket: env.FIREBASE_STORAGE_BUCKET,
      projectId: "sofiya-bangles"
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
