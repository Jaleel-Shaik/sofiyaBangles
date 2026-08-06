import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db } from '../shared/config/firebase';

async function printDB() {
  try {
    console.log('--- MODEL TYPES ---');
    const mts = await db.collection('model_types').get();
    if (mts.empty) {
      console.log('No model types found.');
    } else {
      mts.forEach((doc: any) => {
        console.log(`ID: ${doc.id}, Name: ${doc.data().name || doc.data().name_en}`);
      });
    }

    console.log('\n--- CATEGORIES ---');
    const cats = await db.collection('categories').get();
    if (cats.empty) {
      console.log('No categories found.');
    } else {
      cats.forEach((doc: any) => {
        const data = doc.data();
        console.log(`ID: ${doc.id}, Name: ${data.category_name}, Model Type ID: ${data.model_type_id}, Active: ${data.is_active}`);
      });
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
  process.exit(0);
}

printDB();
