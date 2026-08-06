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
    const snap = await db.collection('admins').where('email', '==', email).limit(1).get();
    if (snap.empty) {
      console.log(`No admin found with email: ${email}`);
      return;
    }
    const adminDoc = snap.docs[0];
    
    console.log(`Resetting 2FA for Admin: ${email}`);
    
    await db.collection('admins').doc(adminDoc.id).update({
      is_2fa_enabled: false,
      two_fa_secret: null
    });
    
    console.log(`Successfully disabled 2FA for ${email}. Next login will prompt for a new 2FA setup QR code.`);
  } catch (error) {
    console.error('Error resetting 2FA:', error);
  }
  process.exit(0);
}

reset2FA();
