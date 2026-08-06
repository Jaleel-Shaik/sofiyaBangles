import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db } from '../shared/config/firebase';

async function printLogs() {
  try {
    const snap = await db.collection('audit_logs')
      .orderBy('created_at', 'desc')
      .limit(10)
      .get();
      
    if (snap.empty) {
      console.log('No audit logs found.');
      return;
    }
    
    snap.forEach((doc: any) => {
      const data = doc.data();
      console.log(`[${data.created_at}] Action: ${data.action}, Details: ${data.details}, User: ${data.actor_id}`);
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
  }
  process.exit(0);
}

printLogs();
