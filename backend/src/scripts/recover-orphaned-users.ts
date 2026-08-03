import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db, auth } from '../shared/config/firebase';

/**
 * Recovers accounts after a Firestore data wipe that left Firebase
 * Authentication intact.
 *
 * Firebase Auth and Firestore are separate stores:
 *   - Auth  = the credentials (email + password), kept even after a wipe
 *   - Firestore = the profile docs (users/admins) the backend verifies login against
 *
 * After a wipe, Auth users still "exist" but the backend's /auth/login returns
 * INVALID_CREDENTIALS because there is no profile doc to verify against.
 * This script recreates a minimal profile doc (using the Auth user's uid as the
 * doc id) for every Auth account that is missing from Firestore.
 *
 * Accounts carrying the custom claim role === 'admin' (set by create-admin.ts)
 * are restored to the "admins" collection; every other account is restored to
 * "users". Nothing is seeded — this reads everything dynamically from Firebase
 * Auth.
 */
const recoverOrphanedUsers = async () => {
  console.log('Scanning Firebase Auth users for missing Firestore profiles...');

  let created = 0;
  let skipped = 0;
  let errors = 0;
  let nextPageToken: string | undefined;

  do {
    const listResult = await auth.listUsers(500, nextPageToken);
    for (const user of listResult.users) {
      try {
        const uid = user.uid;
        const email = user.email || '';
        const claims = user.customClaims || {};
        const role = claims.role === 'admin' || claims.role === 'super_admin'
          ? (claims.role as string)
          : 'user';
        const userType = role === 'admin' || role === 'super_admin' ? 'admins' : 'users';

        const docRef = db.collection(userType).doc(uid);
        const doc = await docRef.get();
        if (doc.exists) {
          skipped++;
          continue;
        }

        await docRef.set({
          id: uid,
          email,
          full_name: user.displayName || email,
          phone: null,
          role,
          password_hash: '',
          avatar_url: null,
          expo_push_token: null,
          is_active: true,
          is_2fa_enabled: false,
          two_fa_secret: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        created++;
        console.log(`✅ Restored ${userType}/${uid} (${email}, role=${role})`);
      } catch (error) {
        errors++;
        console.error(`❌ Failed to restore ${user.uid} (${user.email})`, error);
      }
    }
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  console.log(`\nDone. Created ${created}, skipped ${skipped}, errors ${errors}.`);
  process.exit(0);
};

recoverOrphanedUsers();
