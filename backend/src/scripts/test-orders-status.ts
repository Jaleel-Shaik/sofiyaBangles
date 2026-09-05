import { db } from "../shared/config/firebase";

async function main() {
  const snap = await db.collection("orders").get();
  console.log("Found orders count:", snap.size);
  snap.docs.forEach((doc) => {
    const data = doc.data();
    console.log(`Order: ${doc.id} | No: ${data.order_number} | Status: ${data.status} | Amount: ${data.total_amount}`);
  });

  const pSnap = await db.collection("products").limit(5).get();
  console.log("Found products count:", pSnap.size);
  pSnap.docs.forEach((doc) => {
    const data = doc.data();
    console.log(`Product: ${doc.id} | Name: ${data.product_name} | Stock: ${data.quantity} | Price: ${data.price}`);
  });
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
