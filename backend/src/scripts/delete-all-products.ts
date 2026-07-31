import { db } from "../shared/config/firebase";

const BATCH_LIMIT = 500;

async function deleteFavoritesByProduct(productId: string) {
  const snapshot = await db.collection("favorites").where("product_id", "==", productId).get();
  if (snapshot.empty) return 0;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

async function deleteReviewsByProduct(productId: string) {
  const snapshot = await db.collection("product_reviews").where("product_id", "==", productId).get();
  if (snapshot.empty) return 0;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

async function nullifyNotificationRefs(productId: string) {
  const snapshot = await db.collection("notifications").where("product_id", "==", productId).get();
  if (snapshot.empty) return 0;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.update(doc.ref, { product_id: null }));
  await batch.commit();
  return snapshot.size;
}

async function cascadeDeleteProduct(productId: string) {
  const [favs, reviews, notifs] = await Promise.all([
    deleteFavoritesByProduct(productId),
    deleteReviewsByProduct(productId),
    nullifyNotificationRefs(productId),
  ]);
  return { favs, reviews, notifs };
}

async function deleteAllProducts() {
  const snapshot = await db.collection("products").get();
  const totalProducts = snapshot.size;
  console.log(`Found ${totalProducts} product(s).`);

  if (totalProducts === 0) {
    console.log("No products found to delete.");
    return;
  }

  // Delete all product documents in batches of 500
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + BATCH_LIMIT);
    chunk.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Deleted ${Math.min(i + BATCH_LIMIT, docs.length)}/${totalProducts} product docs...`);
  }

  // Cascade cleanup for favorites, reviews, notifications
  console.log("Cleaning up related data (favorites, reviews, notifications)...");
  for (const doc of docs) {
    await cascadeDeleteProduct(doc.id);
  }

  console.log(`Done. Deleted ${totalProducts} products and cleaned up related data.`);
}

deleteAllProducts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });