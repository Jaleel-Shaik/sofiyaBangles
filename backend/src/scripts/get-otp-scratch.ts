import * as dotenv from 'dotenv';
import path from 'path';
const { generate } = require('otplib');
import { decryptSecret } from '../shared/utils/crypto.utils';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db } from '../shared/config/firebase';

async function generateOtp() {
  try {
    const emailInput = process.argv[2]?.trim().toLowerCase();

    if (!emailInput) {
      console.log('Usage: npx ts-node src/scripts/get-otp-scratch.ts <email>');
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
    const adminData = adminDoc.data();
    
    console.log(`Pulling 2FA secret for Admin: ${email}`);
    
    const encryptedSecret = adminData.two_fa_secret;
    if (!encryptedSecret) {
      console.log('2FA secret not found for admin.');
      return;
    }
    
    const secret = decryptSecret(encryptedSecret);
    const code = await generate({ secret });
    console.log(`Current OTP Code for ${email}: ${code}`);
  } catch (error) {
    console.error('Error generating OTP:', error);
  }
  process.exit(0);
}

generateOtp();
