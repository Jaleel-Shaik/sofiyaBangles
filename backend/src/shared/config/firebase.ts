import * as admin from 'firebase-admin';
import { env } from './env';

import fs from 'fs';
import path from 'path';

export let firebaseCredentialSource = "none";
export let firebaseInitError: string | null = null;

// Resolve the service-account.json in order of priority:
// 1. FIREBASE_SERVICE_ACCOUNT_JSON (inline JSON string in env)
// 2. FIREBASE_SERVICE_ACCOUNT_BASE64 (base64 encoded JSON string in env)
// 3. GOOGLE_APPLICATION_CREDENTIALS env var (explicit file path)
// 4. Project root / CWD (works in Docker where file is mounted at /app/)
// 5. Relative to compiled __dirname (legacy fallback)
function getFirebaseCredential(): admin.credential.Credential {
  // Option A: Raw JSON string in environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
      const parsed = JSON.parse(raw);
      console.log('✅ Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT_JSON env var');
      firebaseCredentialSource = "FIREBASE_SERVICE_ACCOUNT_JSON";
      return admin.credential.cert(parsed);
    } catch (e: any) {
      console.warn('⚠️ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
    }
  }

  // Option B: Base64-encoded JSON string in environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.trim().replace(/^["']|["']$/g, '');
      const decoded = Buffer.from(raw, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      console.log('✅ Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT_BASE64 env var');
      firebaseCredentialSource = "FIREBASE_SERVICE_ACCOUNT_BASE64";
      return admin.credential.cert(parsed);
    } catch (e: any) {
      console.warn('⚠️ Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:', e.message);
    }
  }

  // Option C: File path candidates
  const candidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS ? path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS) : null,
    path.resolve(process.cwd(), 'service-account.json'),
    path.resolve(__dirname, '../../service-account.json'),
    path.resolve(__dirname, '../../../service-account.json'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      console.log(`✅ Loading Firebase credentials from file: ${candidate}`);
      firebaseCredentialSource = `file:${candidate}`;
      const serviceAccount = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      return admin.credential.cert(serviceAccount);
    }
  }

  console.error('❌ CRITICAL: No valid Firebase service-account found in env or files! Queries will hang waiting for GCP metadata.');
  firebaseCredentialSource = "applicationDefault (unconfigured)";
  return admin.credential.applicationDefault();
}

if (!admin.apps.length) {
  try {
    const credential = getFirebaseCredential();

    admin.initializeApp({
      credential,
      storageBucket: env.FIREBASE_STORAGE_BUCKET,
      projectId: "sofiya-bangles"
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error: any) {
    firebaseInitError = error.message;
    console.error('Firebase Admin initialization error', error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();

