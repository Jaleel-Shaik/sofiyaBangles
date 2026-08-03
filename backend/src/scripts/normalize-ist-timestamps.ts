import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db } from '../shared/config/firebase';
import { toISTISO } from '../shared/utils/datetime';

/**
 * One-time normalization of already-stored timestamps to Indian Standard
 * Time (UTC+05:30). Converts display-oriented timestamp fields from the old
 * UTC ("...Z") format to IST ISO ("...+05:30").
 *
 * Only display/audit collections are touched. Temporary records that rely on
 * UTC string comparisons for cleanup (login_sessions/refresh_tokens/
 * login_challenges/otp_status) are left untouched on purpose.
 *
 *   npx ts-node src/scripts/normalize-ist-timestamps.ts
 */
const COLLECTIONS = [
  { name: 'audit_logs', fields: ['created_at', 'login_time', 'logout_time'] },
  { name: 'security_events', fields: ['created_at'] },
  { name: 'users', fields: ['created_at', 'updated_at'] },
  { name: 'admins', fields: ['created_at', 'updated_at'] },
];

const normalizeCollection = async (
  name: string,
  fields: string[],
): Promise<number> => {
  const snapshot = await db.collection(name).get();
  const docsToUpdate = snapshot.docs.filter((doc) => {
    const data = doc.data();
    return fields.some((field) => {
      const value = data[field];
      return typeof value === 'string' && value && toISTISO(value) !== value;
    });
  });

  let committed = 0;
  for (let i = 0; i < docsToUpdate.length; i += 450) {
    const batch = db.batch();
    docsToUpdate.slice(i, i + 450).forEach((doc) => {
      const data = doc.data();
      const updates: Record<string, unknown> = {};
      fields.forEach((field) => {
        const value = data[field];
        if (typeof value === 'string' && value) {
          const converted = toISTISO(value);
          if (converted && converted !== value) updates[field] = converted;
        }
      });
      batch.update(doc.ref, updates);
    });
    await batch.commit();
    committed += docsToUpdate.slice(i, i + 450).length;
    console.log(`  ${name}: committed ${Math.min(i + 450, docsToUpdate.length)}/${docsToUpdate.length}`);
  }

  return committed;
};

const normalize = async () => {
  console.log('Normalizing timestamps to Indian Standard Time (+05:30)...');

  for (const { name, fields } of COLLECTIONS) {
    const count = await normalizeCollection(name, fields);
    console.log(`✅ ${name}: ${count} doc(s) updated`);
  }

  console.log('Done.');
  process.exit(0);
};

normalize();
