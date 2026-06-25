import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db, auth } from '../config/firebase';

const ADMINS = [
  {
    name: 'Jaleel Basha',
    email: 'jaleelbashashaik18@gmail.com',
    password: 'Jaleel@123',
    mobile: '9390902587',
  },
  {
    name: 'Sofiya',
    email: 'shaikjaleelbasha10@gmail.com',
    password: 'Sofiya@123',
    mobile: '9390902587',
  }
];

const seedAdmins = async () => {
  console.log('Seeding Admins...');

  for (const adminUser of ADMINS) {
    try {
      // 1. Create or update user in Firebase Auth
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(adminUser.email);
        console.log(`User ${adminUser.email} already exists in Auth. Updating password.`);
        await auth.updateUser(userRecord.uid, {
          password: adminUser.password,
          displayName: adminUser.name,
        });
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          console.log(`Creating user ${adminUser.email} in Auth.`);
          userRecord = await auth.createUser({
            email: adminUser.email,
            password: adminUser.password,
            displayName: adminUser.name,
          });
        } else {
          throw err;
        }
      }

      // 2. Create or update profile in Firestore
      const profileRef = db.collection('profiles').doc(userRecord.uid);
      await profileRef.set({
        id: userRecord.uid,
        email: adminUser.email,
        full_name: adminUser.name,
        phone: adminUser.mobile,
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { merge: true });

      console.log(`✅ Successfully seeded Admin: ${adminUser.name} (${adminUser.email})`);

    } catch (error) {
      console.error(`❌ Failed to seed Admin: ${adminUser.email}`, error);
    }
  }

  console.log('Seeding complete.');
  process.exit(0);
};

seedAdmins();
