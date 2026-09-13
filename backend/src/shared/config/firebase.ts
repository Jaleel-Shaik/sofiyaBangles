import * as admin from 'firebase-admin';
import { env } from './env';

import fs from 'fs';
import path from 'path';

export let firebaseCredentialSource = "none";
export let firebaseInitError: string | null = null;

/**
 * Normalizes service account credential objects.
 * Fixes escaped newline characters in private_key (frequent issue when passing keys via CI or env vars).
 */
function sanitizeServiceAccount(account: any): any {
  if (!account || typeof account !== 'object') return account;
  if (typeof account.private_key === 'string') {
    return {
      ...account,
      private_key: account.private_key.replace(/\\n/g, '\n').trim(),
    };
  }
  return account;
}

// Resolve the service-account.json in order of priority:
// 1. FIREBASE_SERVICE_ACCOUNT_JSON (inline JSON string in env)
// 2. FIREBASE_SERVICE_ACCOUNT_BASE64 (base64 encoded JSON string in env)
// 3. GOOGLE_APPLICATION_CREDENTIALS env var (explicit file path)
// 4. Project root / CWD (works in Docker where file is mounted at /app/)
// 5. Relative to compiled __dirname (legacy fallback)
function getFirebaseCredential(): admin.credential.Credential | undefined {
  // Option A: Raw JSON string in environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
      const parsed = sanitizeServiceAccount(JSON.parse(raw));
      const cred = admin.credential.cert(parsed);
      console.log('✅ Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT_JSON env var');
      firebaseCredentialSource = "FIREBASE_SERVICE_ACCOUNT_JSON";
      return cred;
    } catch (e: any) {
      console.warn('⚠️ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
    }
  }

  // Option B: Base64-encoded JSON string in environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.trim().replace(/^["']|["']$/g, '');
      const decoded = Buffer.from(raw, 'base64').toString('utf-8');
      const parsed = sanitizeServiceAccount(JSON.parse(decoded));
      const cred = admin.credential.cert(parsed);
      console.log('✅ Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT_BASE64 env var');
      firebaseCredentialSource = "FIREBASE_SERVICE_ACCOUNT_BASE64";
      return cred;
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
      try {
        const fileContent = fs.readFileSync(candidate, 'utf8');
        const serviceAccount = sanitizeServiceAccount(JSON.parse(fileContent));
        const cred = admin.credential.cert(serviceAccount);
        console.log(`✅ Loading Firebase credentials from file: ${candidate}`);
        firebaseCredentialSource = `file:${candidate}`;
        return cred;
      } catch (e: any) {
        console.warn(`⚠️ Failed to parse Firebase credentials from file ${candidate}:`, e.message);
      }
    }
  }

  console.warn('⚠️ No valid Firebase service-account found in env or files. Attempting applicationDefault credentials.');
  try {
    const defaultCred = admin.credential.applicationDefault();
    firebaseCredentialSource = "applicationDefault";
    return defaultCred;
  } catch (err: any) {
    console.warn('⚠️ applicationDefault() credentials not available:', err.message);
    firebaseCredentialSource = "applicationDefault (unconfigured)";
    return undefined;
  }
}

if (!admin.apps.length) {
  try {
    const credential = getFirebaseCredential();

    admin.initializeApp({
      ...(credential ? { credential } : {}),
      storageBucket: env.FIREBASE_STORAGE_BUCKET,
      projectId: "sofiya-bangles"
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error: any) {
    firebaseInitError = error.message;
    console.error('Firebase Admin initialization error', error);
  }
}

// Fallback: Ensure default app exists so admin.firestore() and admin.auth() do not crash on export
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: "sofiya-bangles-fallback"
    });
    console.warn('⚠️ Fallback Firebase Admin app initialized for safe module exports');
  } catch (fallbackErr: any) {
    console.error('CRITICAL: Unable to initialize fallback Firebase app:', fallbackErr);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();

