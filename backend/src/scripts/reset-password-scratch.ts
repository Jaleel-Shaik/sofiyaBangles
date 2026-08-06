import * as dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db, auth } from '../shared/config/firebase';

async function resetPassword() {
  try {
    const emailInput = process.argv[2]?.trim().toLowerCase();
    const password = process.argv[3];

    if (!emailInput) {
      console.log('Usage: npx ts-node src/scripts/reset-password-scratch.ts <email> [new_password]');
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
    
    console.log(`Resetting password for Admin Email: ${email}`);
    
    const userRecord = await auth.getUserByEmail(email);
    await auth.updateUser(userRecord.uid, { password });
    
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);
    
    await db.collection('admins').doc(userRecord.uid).update({
      password_hash
    });
    
    console.log(`Successfully reset admin password for ${email} to: ${password}`);
  } catch (error) {
    console.error('Error resetting password:', error);
  }
  process.exit(0);
}

resetPassword();
