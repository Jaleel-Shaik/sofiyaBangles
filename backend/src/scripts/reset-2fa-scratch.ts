import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db } from '../shared/config/firebase';

async function reset2FA() {
  try {
    const emailInput = process.argv[2]?.trim().toLowerCase();

    if (!emailInput) {
      console.log('Usage: npx ts-node src/scripts/reset-2fa-scratch.ts <email>');
      console.log('\nAvailable admins in database:');
      const snap = await db.collection('admins').get();
      if (snap.empty) {
        console.log('  No admins found.');
      } else {
        snap.forEach((doc: any) => {
          console.log(`  - ${doc.data().email}`);
        });
      }
      return;
    }

    const email = emailInput;
    let targetDoc = null;
    let targetCollection = 'admins';

    let snap = await db.collection('admins').where('email', '==', email).limit(1).get();
    if (!snap.empty) {
      targetDoc = snap.docs[0];
    } else {
      snap = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!snap.empty) {
        targetDoc = snap.docs[0];
        targetCollection = 'users';
      }
    }

    if (!targetDoc) {
      console.log(`No account found with email: ${email}`);
      return;
    }
    
    console.log(`Resetting 2FA for account: ${email} in collection: ${targetCollection}`);
    
    await db.collection(targetCollection).doc(targetDoc.id).update({
      is_2fa_enabled: false,
      twoFactorEnabled: false,
      two_fa_secret: null,
      twoFactorSecretEncrypted: null,
      pendingTwoFactorSecretEncrypted: null,
      backupCodesHash: [],
      accountLockedUntil: null,
      failedOtpAttempts: 0,
      failed_attempts: 0,
      two_fa_updated_at: null,
      twoFactorEnabledAt: null,
    });

    // Also clear any active login challenges for this user
    const chalSnap = await db.collection('login_challenges').where('email', '==', email).get();
    for (const cDoc of chalSnap.docs) {
      await cDoc.ref.delete();
    }
    
    console.log(`Successfully reset 2FA for ${email}. Next login will prompt for a fresh 2FA setup QR code.`);
  } catch (error) {
    console.error('Error resetting 2FA:', error);
  }
  process.exit(0);
}

reset2FA();
