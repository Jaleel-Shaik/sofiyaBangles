import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReviewStats, createProductModel, deleteProductModel, restoreProductModel } from './product.model';
import { createProductSchema } from '../validations/product.validation';
import { db } from '../../../shared/config/firebase';

test('Product Model Setup and Lifecycle', async (t) => {
  await t.test('calculateReviewStats averages ratings and preserves review count', () => {
    const result = calculateReviewStats([
      { rating: 5 },
      { rating: 4 },
      { rating: 3 },
    ] as Array<{ rating: number }>);

    assert.deepEqual(result, { rating: 4, reviews: 3 });
  });

  await t.test('Product lifecycle: creation, soft-deletion, and restoration updates properties', async () => {
    const testModelId = 'test-mt-' + Date.now();
    const testCatId = 'test-cat-' + Date.now();

    // Seed prerequisite ModelType and Category
    await db.collection("model_types").doc(testModelId).set({
      id: testModelId,
      name: "Test Model Type",
      is_active: true,
      created_at: new Date().toISOString()
    });

    await db.collection("categories").doc(testCatId).set({
      id: testCatId,
      category_name: "Test Category",
      model_type_id: testModelId,
      is_active: true,
      created_at: new Date().toISOString()
    });

    try {
      // 1. Create product
      const product = await createProductModel({
        product_name: 'Test Bangle',
        price: 150,
        quantity: 10,
        is_active: true,
        category_id: testCatId,
        model_type_id: testModelId
      });

      assert.ok(product.id, 'Product should have an ID');
      assert.equal(product.status, 'active', 'Created product status should be active');
      assert.equal(product.deleted_at, null, 'New product deleted_at should be null');

      // 2. Soft-delete product
      const deletedProduct = await deleteProductModel(product.id);
      assert.ok(deletedProduct, 'Deleted product should be returned');
      
      // Fetch from DB to ensure persisted
      const doc = await db.collection("products").doc(product.id).get();
      const updated = doc.data();

      assert.ok(updated, 'Updated document data should exist');
      assert.equal(updated.is_active, false, 'Soft-deleted product is_active should be false');
      assert.equal(updated.status, 'archived', 'Soft-deleted product status should be archived');
      assert.ok(updated.deleted_at, 'deleted_at should be populated with timestamp');

      // 3. Restore product
      await restoreProductModel(product.id);
      const docRestored = await db.collection("products").doc(product.id).get();
      const restored = docRestored.data();

      assert.ok(restored, 'Restored document data should exist');
      assert.equal(restored.is_active, true, 'Restored product is_active should be true');
      assert.equal(restored.status, 'active', 'Restored product status should be active');
      assert.equal(restored.deleted_at, null, 'Restored product deleted_at should be null');

      // Cleanup product
      await db.collection("products").doc(product.id).delete();
    } finally {
      // Cleanup prerequisite seeds
      await db.collection("model_types").doc(testModelId).delete();
      await db.collection("categories").doc(testCatId).delete();
    }
  });

  await t.test('createProductSchema parses and transforms multipart string fields correctly', () => {
    const rawInput = {
      product_name: 'Test Product Parsing',
      category_id: 'test-cat-id',
      model_type_id: 'test-model-id',
      price: '199.99',
      quantity: '42',
      has_variants: 'true',
      variants: JSON.stringify([
        { id: 'v1', size: '2.4', price: '199.99', quantity: '20' }
      ]),
      accepts_custom_size: 'true',
      custom_size_price: '249.99'
    };

    const parsed = createProductSchema.parse(rawInput);

    assert.equal(parsed.product_name, 'Test Product Parsing');
    assert.equal(parsed.category_id, 'test-cat-id');
    assert.equal(parsed.model_type_id, 'test-model-id');
    assert.equal(parsed.price, 199.99, 'price should be parsed as number');
    assert.equal(parsed.quantity, 42, 'quantity should be parsed as integer');
    assert.equal(parsed.has_variants, true, 'has_variants should be parsed as boolean');
    assert.ok(Array.isArray(parsed.variants), 'variants should be parsed to an array');
    assert.equal(parsed.variants[0].size, '2.4');
    assert.equal(parsed.accepts_custom_size, true, 'accepts_custom_size should be parsed as boolean');
    assert.equal(parsed.custom_size_price, 249.99, 'custom_size_price should be parsed as number');
  });
});

