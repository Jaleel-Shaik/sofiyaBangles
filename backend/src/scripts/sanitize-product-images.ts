import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db } from '../shared/config/firebase';

function sanitizeSingleUrl(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw !== 'string') {
    if (typeof raw === 'object' && raw !== null && 'image_url' in raw) {
      return sanitizeSingleUrl((raw as any).image_url);
    }
    return '';
  }
  let s = raw.trim();
  while (
    (s.startsWith('[') && s.endsWith(']')) ||
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          s = typeof parsed[0] === 'string' ? parsed[0].trim() : String(parsed[0]);
          continue;
        }
      } catch {
        s = s.slice(1, -1).trim();
      }
    } else {
      s = s.slice(1, -1).trim();
    }
  }
  s = s.replace(/^[\\"'`]+|[\\"'`]+$/g, '').trim();
  return s;
}

async function run() {
  console.log('--- Starting Product Images Sanitization ---');

  // 1. Sanitize 'products' collection
  const productsSnap = await db.collection('products').get();
  console.log(`Found ${productsSnap.size} products in Firestore.`);
  let fixedProductsCount = 0;

  for (const doc of productsSnap.docs) {
    const data = doc.data();
    const rawUrl = data.image_url;
    if (typeof rawUrl === 'string' && (rawUrl.startsWith('[') || rawUrl.includes('\\"') || rawUrl.startsWith('"'))) {
      const cleanUrl = sanitizeSingleUrl(rawUrl);
      console.log(`Product [${data.unique_code || doc.id}] "${data.product_name}":`);
      console.log(`  OLD: ${rawUrl}`);
      console.log(`  NEW: ${cleanUrl}`);
      await doc.ref.update({
        image_url: cleanUrl || null,
        updated_at: new Date().toISOString(),
      });
      fixedProductsCount++;
    }
  }

  // 2. Sanitize 'product_images' collection
  const imagesSnap = await db.collection('product_images').get();
  console.log(`Found ${imagesSnap.size} entries in product_images.`);
  let fixedImagesCount = 0;

  for (const doc of imagesSnap.docs) {
    const data = doc.data();
    const rawUrl = data.image_url;
    if (typeof rawUrl === 'string' && (rawUrl.startsWith('[') || rawUrl.includes('\\"') || rawUrl.startsWith('"'))) {
      const cleanUrl = sanitizeSingleUrl(rawUrl);
      console.log(`ProductImage [${doc.id}] for product [${data.product_id}]:`);
      console.log(`  OLD: ${rawUrl}`);
      console.log(`  NEW: ${cleanUrl}`);
      await doc.ref.update({
        image_url: cleanUrl,
        updated_at: new Date().toISOString(),
      });
      fixedImagesCount++;
    }
  }

  console.log(`--- Finished: Fixed ${fixedProductsCount} products and ${fixedImagesCount} product_images ---`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Sanitization failed:', err);
  process.exit(1);
});
