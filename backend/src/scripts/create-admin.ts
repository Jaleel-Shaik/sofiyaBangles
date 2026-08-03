import * as dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import readline from 'readline/promises';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db, auth } from '../shared/config/firebase';
import { nowISTISO } from '../shared/utils/datetime';

/**
 * Dynamically creates an admin account at runtime.
 *
 * No admin data is baked into the codebase or seeded anywhere. You run this
 * script and enter the admin details, and it:
 *   1. Creates (or updates) the user in Firebase Auth
 *   2. Tags the Auth user with the custom claim role === 'admin'
 *   3. Creates the profile document in the "admins" collection (with bcrypt
 *      password hash) so the backend /auth/login verifies it immediately
 *
 *   npx ts-node src/scripts/create-admin.ts
 */
const createAdmin = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const fullName = (await rl.question('Full name: ')).trim();
  const email = (await rl.question('Email: ')).trim().toLowerCase();
  const phone = (await rl.question('Phone (optional): ')).trim();
  const password = await rl.question('Password: ');
  rl.close();

  if (!fullName || !email || !password) {
    console.error('Full name, email and password are all required.');
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Invalid email address.');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Password must be at least 6 characters.');
    process.exit(1);
  }

  console.log(`Creating admin: ${fullName} <${email}>`);

  // 1. Create or update the Firebase Auth user
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log('User already exists in Auth. Updating password...');
    await auth.updateUser(userRecord.uid, {
      password,
      displayName: fullName,
    });
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      console.log('Creating user in Auth...');
      userRecord = await auth.createUser({
        email,
        password,
        displayName: fullName,
      });
    } else {
      throw err;
    }
  }

  // 2. Tag the Auth user as an admin
  await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });

  // 3. Create the profile doc in the "admins" collection
  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(password, salt);

  await db.collection('admins').doc(userRecord.uid).set({
    id: userRecord.uid,
    email,
    full_name: fullName,
    phone: phone || null,
    role: 'admin',
    password_hash,
    avatar_url: null,
    expo_push_token: null,
    is_active: true,
    is_2fa_enabled: false,
    two_fa_secret: null,
    created_at: nowISTISO(),
    updated_at: nowISTISO(),
  });

  console.log(`✅ Successfully created admin: ${fullName} (${email})`);
  process.exit(0);
};

createAdmin();
