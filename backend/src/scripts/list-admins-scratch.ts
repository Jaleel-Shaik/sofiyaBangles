import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db } from '../shared/config/firebase';

async function listAdmins() {
  try {
    const snap = await db.collection('admins').get();
    if (snap.empty) {
      console.log('No admins found.');
      return;
    }
    snap.forEach((doc: any) => {
      console.log(`Admin Email: ${doc.data().email}, Role: ${doc.data().role}, 2FA: ${doc.data().is_2fa_enabled}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

listAdmins();
